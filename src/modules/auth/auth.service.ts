import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const BCRYPT_SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthResponse extends AuthTokens {
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: normalizedUsername }, { email: normalizedEmail }],
      },
      select: { username: true, email: true },
    });

    if (existing) {
      if (existing.username === normalizedUsername) {
        throw new ConflictException('Tên đăng nhập đã được sử dụng');
      }
      throw new ConflictException('Email đã được đăng ký');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const generatedDisplayName = `user_${randomBytes(3).toString('hex')}`;

    const user = await this.prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password: passwordHash,
        fullName: generatedDisplayName,
        phone: dto.phone?.trim(),
        role: Role.CUSTOMER,
        cart: {
          create: {},
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.issueAndStoreTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, ...tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const tokens = await this.issueAndStoreTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        refreshTokenHash: true,
      },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      throw new ForbiddenException('Invalid refresh token');
    }

    return this.issueAndStoreTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        refreshTokenHash: { not: null },
      },
      data: { refreshTokenHash: null },
    });
  }

  private async issueAndStoreTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }
}
