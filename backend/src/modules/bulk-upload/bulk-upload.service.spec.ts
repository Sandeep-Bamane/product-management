import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { BulkUploadService } from './bulk-upload.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  bulkUploadJob: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'queue-job-1' }),
};

const baseJob = {
  id: 'job-1',
  status: 'queued',
  filePath: '/uploads/bulk/test.csv',
  total: 0,
  processed: 0,
  failed: 0,
  errors: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: { id: 'user-1', email: 'admin@example.com' },
};

describe('BulkUploadService', () => {
  let service: BulkUploadService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('bulk-upload'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BulkUploadService>(BulkUploadService);
  });

  // ── startJob ───────────────────────────────────────────────────────────

  describe('startJob', () => {
    it('creates a BulkUploadJob record and enqueues a BullMQ job', async () => {
      mockPrisma.bulkUploadJob.create.mockResolvedValue(baseJob);

      const result = await service.startJob('/uploads/bulk/test.csv', 'user-1');

      expect(mockPrisma.bulkUploadJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filePath: '/uploads/bulk/test.csv',
            status: 'queued',
            createdById: 'user-1',
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith('process', {
        jobId: baseJob.id,
        filePath: '/uploads/bulk/test.csv',
      });
      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('queued');
    });

    it('returns createdBy from the created job record', async () => {
      mockPrisma.bulkUploadJob.create.mockResolvedValue(baseJob);

      const result = await service.startJob('/uploads/bulk/test.csv', 'user-1');

      expect(result.createdBy).toEqual({ id: 'user-1', email: 'admin@example.com' });
    });

    it('stores createdById as undefined when no userId provided', async () => {
      mockPrisma.bulkUploadJob.create.mockResolvedValue({ ...baseJob, createdById: null, createdBy: null });

      await service.startJob('/uploads/bulk/anon.csv');

      const createArg = mockPrisma.bulkUploadJob.create.mock.calls[0][0];
      expect(createArg.data.createdById).toBeUndefined();
    });
  });

  // ── getStatus ──────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns the job record when found', async () => {
      mockPrisma.bulkUploadJob.findUnique.mockResolvedValue(baseJob);

      const result = await service.getStatus('job-1');

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('queued');
    });

    it('throws NotFoundException when job does not exist', async () => {
      mockPrisma.bulkUploadJob.findUnique.mockResolvedValue(null);

      await expect(service.getStatus('ghost')).rejects.toThrow(NotFoundException);
    });

    it('looks up the job by jobId', async () => {
      mockPrisma.bulkUploadJob.findUnique.mockResolvedValue(baseJob);

      await service.getStatus('job-1');

      expect(mockPrisma.bulkUploadJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
    });
  });
});
