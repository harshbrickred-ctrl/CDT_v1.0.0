import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, page = 1, pageSize = 20) {
    const where = { organizationId, deletedAt: null };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return { items, meta: paginationMeta(total, page, pageSize) };
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    if (existing?.deletedAt) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash,
          isActive: true,
          deletedAt: null,
        },
        select: userSelect,
      });
    }
    return this.prisma.user.create({
      data: {
        organizationId,
        email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
      },
      select: userSelect,
    });
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(organizationId, id);
    const data: {
      email?: string;
      fullName?: string;
      role?: Role;
      isActive?: boolean;
      passwordHash?: string;
    } = {};
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findUnique({
        where: { organizationId_email: { organizationId, email } },
      });
      if (existing && existing.id !== id && !existing.deletedAt) {
        throw new ConflictException('Email already in use');
      }
      data.email = email;
    }
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async softDelete(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }
}
