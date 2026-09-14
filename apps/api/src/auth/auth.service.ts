import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { resolveOwnedClientIds } from '../common/client-scope';
import { LoginDto } from './dto/auth.dto';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  organizationSlug: 'brickred' | 'agyom';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string, fallbackMs: number): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return fallbackMs;
    const n = Number(match[1]);
    const unit = match[2];
    const mult =
      unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return n * mult;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    organizationId: string;
    organizationSlug: 'brickred' | 'agyom';
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationSlug: user.organizationSlug,
    };

    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.parseTtlMs(refreshTtl, 7 * 86_400_000),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    const ownedClientIds = await resolveOwnedClientIds(this.prisma, {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        organizationSlug: user.organizationSlug,
        ownedClientIds,
      },
    };
  }

  async login(dto: LoginDto) {
    const org = await this.prisma.organization.findUnique({
      where: { slug: dto.organization },
    });
    if (!org) {
      throw new UnauthorizedException('Invalid organization');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        organizationId: org.id,
        deletedAt: null,
      },
      include: { organization: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug as 'brickred' | 'agyom',
    });
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { organization: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedException('User inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      fullName: stored.user.fullName,
      organizationId: stored.user.organizationId,
      organizationSlug: stored.user.organization.slug as 'brickred' | 'agyom',
    });
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        organizationId: true,
        organization: { select: { slug: true, name: true } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
      organizationName: user.organization.name,
      ownedClientIds,
    };
  }
}
