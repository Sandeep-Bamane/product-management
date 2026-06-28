import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'secret' };
    const dbUser = {
      id: 'user-1',
      email: 'user@example.com',
      password: '$2b$12$hashedpassword',
    };

    it('returns an accessToken when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({ accessToken: 'signed-token' });
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: dbUser.id,
        email: dbUser.email,
      });
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('does not reveal whether email or password was wrong (same error message)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const errNoUser = await service.login(dto).catch((e) => e);

      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const errBadPwd = await service.login(dto).catch((e) => e);

      expect(errNoUser.message).toBe(errBadPwd.message);
    });
  });
});
