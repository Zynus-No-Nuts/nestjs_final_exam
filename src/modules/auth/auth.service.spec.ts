import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };
  let configService: { getOrThrow: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    jwtService = {
      signAsync: vi.fn(),
    };
    configService = {
      getOrThrow: vi.fn((key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret-1234567890',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret-1234567890',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return map[key];
      }),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('throws ConflictException when registering with an existing email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      authService.register({
        email: 'taken@example.com',
        password: 'Password@123',
        fullName: 'Test User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registers a new user and issues access & refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      fullName: 'New User',
      phone: null,
      avatarUrl: null,
      role: Role.CUSTOMER,
      createdAt: new Date(),
    });
    jwtService.signAsync.mockResolvedValueOnce('access-jwt').mockResolvedValueOnce('refresh-jwt');
    prisma.user.update.mockResolvedValue({});

    const result = await authService.register({
      email: 'NEW@example.com',
      password: 'Password@123',
      fullName: 'New User',
    });

    expect(result.accessToken).toBe('access-jwt');
    expect(result.refreshToken).toBe('refresh-jwt');
    expect(result.user.email).toBe('new@example.com');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('throws UnauthorizedException when login password does not match', async () => {
    const hash = await bcrypt.hash('CorrectPass@123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: hash,
      fullName: 'User',
      phone: null,
      avatarUrl: null,
      role: Role.CUSTOMER,
      isActive: true,
      createdAt: new Date(),
    });

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
