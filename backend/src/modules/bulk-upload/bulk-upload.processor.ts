import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { extname } from 'path';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { parse } from 'fast-csv';
import { PrismaService } from '../../prisma/prisma.service';

const BATCH_SIZE = 500;

interface RowData {
  name: string;
  price: string;
  category_id: string;
  image_url?: string;
}

@Processor('bulk-upload')
export class BulkUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkUploadProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ jobId: string; filePath: string }>) {
    const { jobId, filePath } = job.data;
    this.logger.log(`Processing bulk upload job ${jobId}`);

    await this.prisma.bulkUploadJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    try {
      const rows = await this.parseFile(filePath);
      const total = rows.length;

      await this.prisma.bulkUploadJob.update({ where: { id: jobId }, data: { total } });

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const genId = () =>
        'PRD-' +
        Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

      let processed = 0;
      let failed = 0;
      const errors: { row: number; reason: string }[] = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowNum = i + j + 2;
          try {
            if (!row.name || !row.price || !row.category_id) {
              throw new Error('Missing required fields: name, price, category_id');
            }
            const price = parseFloat(row.price);
            if (isNaN(price) || price < 0) throw new Error('Invalid price');

            const category = await this.prisma.category.findFirst({
              where: { uniqueId: row.category_id },
            });
            if (!category) throw new Error(`Category not found: ${row.category_id}`);

            await this.prisma.product.create({
              data: {
                uniqueId: genId(),
                name: row.name.trim(),
                price,
                categoryId: category.id,
                image: row.image_url?.trim() || '',
              },
            });
            processed++;
          } catch (err: any) {
            failed++;
            errors.push({ row: rowNum, reason: err.message });
          }
        }

        await this.prisma.bulkUploadJob.update({
          where: { id: jobId },
          data: { processed, failed, errors },
        });
      }

      await this.prisma.bulkUploadJob.update({
        where: { id: jobId },
        data: { status: 'completed', processed, failed, errors },
      });

      this.logger.log(`Job ${jobId} done — ${processed} ok, ${failed} failed`);
    } catch (err: any) {
      this.logger.error(`Job ${jobId} failed: ${err.message}`);
      await this.prisma.bulkUploadJob.update({
        where: { id: jobId },
        data: { status: 'failed', errors: [{ row: 0, reason: err.message }] },
      });
    }
  }

  private parseFile(filePath: string): Promise<RowData[]> {
    const ext = extname(filePath).toLowerCase();
    if (ext === '.csv') return this.parseCsv(filePath);
    return this.parseXlsx(filePath);
  }

  private parseCsv(filePath: string): Promise<RowData[]> {
    return new Promise((resolve, reject) => {
      const rows: RowData[] = [];
      fs.createReadStream(filePath)
        .pipe(parse({ headers: true, trim: true }))
        .on('data', (row: RowData) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  private async parseXlsx(filePath: string): Promise<RowData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return [];

    const rows: RowData[] = [];
    let headers: string[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        headers = (row.values as any[])
          .slice(1)
          .map((v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '_'));
        return;
      }
      const vals = (row.values as any[]).slice(1);
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] !== undefined ? String(vals[i]) : '';
      });
      rows.push(obj as RowData);
    });

    return rows;
  }
}
