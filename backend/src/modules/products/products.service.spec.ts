import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const baseCategory = {
  id: 'cat-1',
  name: 'Electronics',
  uniqueId: 'CAT-ABC123',
};

const baseProduct = {
  id: 'prod-1',
  uniqueId: 'PRD-XYZ789',
  name: 'Laptop',
  image: '',
  price: '999.99',
  categoryId: 'cat-1',
  createdById: 'user-1',
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: baseCategory,
  createdBy: { id: 'user-1', email: 'admin@example.com' },
  updatedBy: null,
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { name: 'Laptop', price: 999.99, categoryId: 'cat-1' };

    it('creates a product with a PRD-XXXXXX uniqueId and stores createdById', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.findUnique.mockResolvedValue(null); // uniqueId free
      mockPrisma.product.create.mockResolvedValue(baseProduct);

      const result = await service.create(dto, undefined, 'user-1');

      const createArg = mockPrisma.product.create.mock.calls[0][0];
      expect(createArg.data.uniqueId).toMatch(/^PRD-[A-Z0-9]{6}$/);
      expect(createArg.data.createdById).toBe('user-1');
      expect(result.name).toBe('Laptop');
    });

    it('sets image path when file is uploaded', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ ...baseProduct, image: '/static/images/photo.jpg' });

      const fakeFile = { filename: 'photo.jpg' } as Express.Multer.File;
      await service.create(dto, fakeFile, 'user-1');

      const createArg = mockPrisma.product.create.mock.calls[0][0];
      expect(createArg.data.image).toBe('/static/images/photo.jpg');
    });

    it('stores empty string for image when no file provided', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(baseProduct);

      await service.create(dto, undefined, 'user-1');

      const createArg = mockPrisma.product.create.mock.calls[0][0];
      expect(createArg.data.image).toBe('');
    });

    it('throws BadRequestException when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, undefined, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('retries uniqueId generation on collision', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(baseCategory);
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(baseProduct) // first uniqueId taken
        .mockResolvedValueOnce(null);        // second uniqueId free
      mockPrisma.product.create.mockResolvedValue(baseProduct);

      await service.create(dto, undefined, 'user-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const query = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };

    it('returns paginated result with metadata', async () => {
      mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('runs findMany and count in parallel', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll(query);

      // Both must be called once in the same tick (Promise.all)
      expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.product.count).toHaveBeenCalledTimes(1);
    });

    it('calculates skip correctly for page 2', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ ...query, page: 2, limit: 5 });

      const findManyArg = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(5);
      expect(findManyArg.take).toBe(5);
    });

    it('applies search filter across name and category name', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ ...query, search: 'laptop' });

      const findManyArg = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.where.OR).toHaveLength(2);
    });

    it('applies categoryId filter when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ ...query, categoryId: 'cat-1' });

      const findManyArg = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyArg.where.categoryId).toBe('cat-1');
    });

    it('returns correct totalPages for multi-page result', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(25);

      const result = await service.findAll({ ...query, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns product with category and audit fields', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(baseProduct);

      const result = await service.findOne('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.category).toBeDefined();
      expect(result.createdBy).toBeDefined();
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates price and stores updatedById', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(baseProduct); // findOne
      const updated = {
        ...baseProduct,
        price: '149.99',
        updatedById: 'user-1',
        updatedBy: { id: 'user-1', email: 'admin@example.com' },
      };
      mockPrisma.product.update.mockResolvedValue(updated);

      const result = await service.update('prod-1', { price: 149.99 }, undefined, 'user-1');

      const updateArg = mockPrisma.product.update.mock.calls[0][0];
      expect(updateArg.data.updatedById).toBe('user-1');
      expect(result.price).toBe('149.99');
    });

    it('validates new categoryId when provided', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.category.findUnique.mockResolvedValue(null); // new category not found

      await expect(
        service.update('prod-1', { categoryId: 'cat-missing' }, undefined, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates image path when file is provided', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.product.update.mockResolvedValue({ ...baseProduct, image: '/static/images/new.jpg' });

      const fakeFile = { filename: 'new.jpg' } as Express.Multer.File;
      await service.update('prod-1', {}, fakeFile, 'user-1');

      const updateArg = mockPrisma.product.update.mock.calls[0][0];
      expect(updateArg.data.image).toBe('/static/images/new.jpg');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('ghost', { price: 99 })).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the product and returns a confirmation message', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.product.delete.mockResolvedValue(baseProduct);

      const result = await service.remove('prod-1');

      expect(result).toEqual({ message: 'Product deleted' });
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
