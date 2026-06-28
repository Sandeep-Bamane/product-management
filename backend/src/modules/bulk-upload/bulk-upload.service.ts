import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BulkUploadService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('bulk-upload') private queue: Queue,
  ) {}

  async startJob(filePath: string, userId?: string) {
    const job = await this.prisma.bulkUploadJob.create({
      data: { filePath, status: 'queued', createdById: userId },
      include: { createdBy: { select: { id: true, email: true } } },
    });
    await this.queue.add('process', { jobId: job.id, filePath });
    return { jobId: job.id, status: job.status, createdBy: job.createdBy };
  }

  async getStatus(jobId: string) {
    const job = await this.prisma.bulkUploadJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Bulk upload job not found');
    return job;
  }
}
