import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    count: jest.fn(),
  },
};

const auditFields = {
  createdBy: { id: 'user-1', email: 'admin@example.com' },
  updatedBy: null,
};

const baseCategory = {
  id: 'cat-1',
  uniqueId: 'CAT-ABC123',
  name: 'Electronics',
  createdById: 'user-1',
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...auditFields,
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a category with a CAT-XXXXXX uniqueId', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);  // no name conflict
      mockPrisma.category.findUnique.mockResolvedValue(null); // uniqueId not taken
      mockPrisma.category.create.mockResolvedValue(baseCategory);

      const result = await service.create({ name: 'Electronics' }, 'user-1');

      expect(mockPrisma.category.create).toHaveBeenCalledTimes(1);
      const createArg = mockPrisma.category.create.mock.calls[0][0];
      expect(createArg.data.uniqueId).toMatch(/^CAT-[A-Z0-9]{6}$/);
      expect(createArg.data.createdById).toBe('user-1');
      expect(result.name).toBe('Electronics');
    });

    it('throws BadRequestException when name already exists', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(baseCategory);

      await expect(service.create({ name: 'Electronics' }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('stores createdById as null when no userId is provided', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ ...baseCategory, createdById: null, createdBy: null });

      await service.create({ name: 'Electronics' });

      const createArg = mockPrisma.category.create.mock.calls[0][0];
      expect(createArg.data.createdById).toBeUndefined();
    });

    it('retries uniqueId generation on collision', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      // First uniqueId attempt returns an existing record, second attempt is free
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(baseCategory)
        .mockResolvedValueOnce(null);
      mockPrisma.category.create.mockResolvedValue(baseCategory);

      await service.create({ name: 'Electronics' }, 'user-1');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([baseCategory]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a category with audit fields', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);

      const result = await service.findOne('cat-1');

      expect(result.id).toBe('cat-1');
      expect(result.createdBy).toBeDefined();
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates name and stores updatedById', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory); // findOne
      mockPrisma.category.findFirst.mockResolvedValue(null);           // no name conflict
      const updated = {
        ...baseCategory,
        name: 'Updated',
        updatedById: 'user-1',
        updatedBy: { id: 'user-1', email: 'admin@example.com' },
      };
      mockPrisma.category.update.mockResolvedValue(updated);

      const result = await service.update('cat-1', { name: 'Updated' }, 'user-1');

      const updateArg = mockPrisma.category.update.mock.calls[0][0];
      expect(updateArg.data.updatedById).toBe('user-1');
      expect(result.name).toBe('Updated');
    });

    it('throws BadRequestException when new name conflicts', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.category.findFirst.mockResolvedValue({ ...baseCategory, id: 'cat-99' });

      await expect(
        service.update('cat-1', { name: 'Conflict' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('ghost', { name: 'X' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a category with no products and returns confirmation', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(baseCategory);

      const result = await service.remove('cat-1');

      expect(result).toEqual({ message: 'Category deleted' });
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('throws BadRequestException when category has existing products', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.count.mockResolvedValue(3);

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
