import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('reports') private queue: Queue,
  ) {}

  async requestReport(dto: CreateReportDto) {
    const job = await this.prisma.reportJob.create({
      data: {
        format: dto.format,
        filters: { categoryId: dto.categoryId, search: dto.search },
        status: 'queued',
      },
    });
    await this.queue.add('generate', {
      jobId: job.id,
      format: dto.format,
      filters: { categoryId: dto.categoryId, search: dto.search },
    });
    return { jobId: job.id, status: job.status };
  }

  async getStatus(jobId: string) {
    const job = await this.prisma.reportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Report job not found');
    return job;
  }

  async getFilePath(jobId: string): Promise<string> {
    const job = await this.getStatus(jobId);
    if (job.status !== 'completed' || !job.filePath) {
      throw new NotFoundException('Report not ready yet');
    }
    return job.filePath;
  }
}
