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
      findFirst: ReturnType<typeof vi.fn>;
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
        findFirst: vi.fn(),
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

  it('throws ConflictException when registering with an existing username', async () => {
    prisma.user.findFirst.mockResolvedValue({
      username: 'takenuser',
      email: 'other@gmail.com',
    });

    await expect(
      authService.register({
        username: 'takenuser',
        email: 'new@gmail.com',
        password: '12345',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registers a new user with auto-generated user_xxxxxx display name and issues tokens', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      ({ data }: { data: { username: string; email: string; fullName: string } }) => ({
        id: 'user-1',
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phone: null,
        avatarUrl: null,
        role: Role.CUSTOMER,
        createdAt: new Date(),
      }),
    );
    jwtService.signAsync.mockResolvedValueOnce('access-jwt').mockResolvedValueOnce('refresh-jwt');
    prisma.user.update.mockResolvedValue({});

    const result = await authService.register({
      username: 'NewUser01',
      email: 'NEW@gmail.com',
      password: '12345',
    });

    expect(result.accessToken).toBe('access-jwt');
    expect(result.refreshToken).toBe('refresh-jwt');
    expect(result.user.username).toBe('newuser01');
    expect(result.user.email).toBe('new@gmail.com');
    expect(result.user.fullName).toMatch(/^user_[a-f0-9]{6}$/);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('throws UnauthorizedException when login password does not match', async () => {
    const hash = await bcrypt.hash('12345', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'customer01',
      email: 'user@gmail.com',
      password: hash,
      fullName: 'user_123abc',
      phone: null,
      avatarUrl: null,
      role: Role.CUSTOMER,
      isActive: true,
      createdAt: new Date(),
    });

    await expect(
      authService.login({
        username: 'customer01',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
