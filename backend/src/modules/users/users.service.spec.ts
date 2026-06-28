import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const baseUser = {
  id: 'user-1',
  email: 'alice@example.com',
  password: '$2b$12$hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Return user without password (as the service does)
const safeUser = (({ password: _, ...rest }) => rest)(baseUser);

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates user and strips password from response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.create({ email: 'alice@example.com', password: 'pass' });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('alice@example.com');
    });

    it('throws BadRequestException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.create({ email: 'alice@example.com', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      mockPrisma.user.create.mockResolvedValue(baseUser);

      await service.create({ email: 'alice@example.com', password: 'plaintext' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.password).toBe('$2b$12$hashed');
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all users without passwords', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser, { ...baseUser, id: 'user-2', email: 'bob@example.com' }]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      result.forEach((u) => expect(u).not.toHaveProperty('password'));
    });

    it('returns empty array when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the user without password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.findOne('user-1');

      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns user without password', async () => {
      const updated = { ...baseUser, email: 'alice-new@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(baseUser); // findOne check
      mockPrisma.user.findFirst.mockResolvedValue(null);       // email conflict check
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update('user-1', { email: 'alice-new@example.com' });

      expect(result.email).toBe('alice-new@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('hashes new password when provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newHash');
      mockPrisma.user.update.mockResolvedValue(baseUser);

      await service.update('user-1', { password: 'newplain' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newplain', 12);
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.password).toBe('$2b$12$newHash');
    });

    it('throws BadRequestException when new email conflicts with another user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser); // findOne check
      mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, id: 'user-2' }); // conflict

      await expect(
        service.update('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('ghost', { email: 'x@x.com' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the user and returns a confirmation message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.delete.mockResolvedValue(baseUser);

      const result = await service.remove('user-1');

      expect(result).toEqual({ message: 'User deleted' });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
