import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { format as formatCsv } from 'fast-csv';
import { PrismaService } from '../../prisma/prisma.service';

const PAGE_SIZE = 1000;

@Processor('reports')
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ jobId: string; format: string; filters: any }>) {
    const { jobId, format, filters } = job.data;
    this.logger.log(`Generating ${format} report for job ${jobId}`);

    await this.prisma.reportJob.update({ where: { id: jobId }, data: { status: 'processing' } });

    try {
      const filePath =
        format === 'xlsx'
          ? await this.generateXlsx(jobId, filters)
          : await this.generateCsv(jobId, filters);

      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'completed', filePath },
      });

      this.logger.log(`Report ${jobId} complete: ${filePath}`);
    } catch (err: any) {
      this.logger.error(`Report ${jobId} failed: ${err.message}`);
      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'failed' },
      });
    }
  }

  private buildWhere(filters: any) {
    if (!filters) return {};
    return {
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { category: { name: { contains: filters.search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  private async *streamProducts(filters: any) {
    const where = this.buildWhere(filters);
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.product.findMany({
        where,
        include: { category: { select: { name: true, uniqueId: true } } },
        take: PAGE_SIZE,
        skip: cursor ? 1 : 0,
        ...(cursor && { cursor: { id: cursor } }),
        orderBy: { createdAt: 'asc' },
      });
      if (rows.length === 0) break;
      yield* rows;
      cursor = rows[rows.length - 1].id;
      if (rows.length < PAGE_SIZE) break;
    }
  }

  private async generateCsv(jobId: string, filters: any): Promise<string> {
    const outputPath = join(process.cwd(), 'generated-reports', `${jobId}.csv`);
    return new Promise(async (resolve, reject) => {
      const ws = createWriteStream(outputPath);
      const csvStream = formatCsv({ headers: true });
      csvStream.pipe(ws);

      for await (const product of this.streamProducts(filters)) {
        csvStream.write({
          'Product ID': product.uniqueId,
          'Product Name': product.name,
          Price: Number(product.price).toFixed(2),
          'Category Name': product.category.name,
          'Category ID': product.category.uniqueId,
          'Created At': product.createdAt.toISOString(),
        });
      }

      csvStream.end();
      ws.on('finish', () => resolve(outputPath));
      ws.on('error', reject);
    });
  }

  private async generateXlsx(jobId: string, filters: any): Promise<string> {
    const outputPath = join(process.cwd(), 'generated-reports', `${jobId}.xlsx`);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: outputPath });
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'Product ID', key: 'productId', width: 15 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Category Name', key: 'categoryName', width: 20 },
      { header: 'Category ID', key: 'categoryId', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    for await (const product of this.streamProducts(filters)) {
      sheet.addRow({
        productId: product.uniqueId,
        name: product.name,
        price: Number(product.price),
        categoryName: product.category.name,
        categoryId: product.category.uniqueId,
        createdAt: product.createdAt.toISOString(),
      }).commit();
    }

    await sheet.commit();
    await workbook.commit();
    return outputPath;
  }
}
