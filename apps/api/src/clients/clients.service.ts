import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeClientName } from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';
import { throwConflictIfUnique } from '../common/prisma-error';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, pageSize = 20, q?: string) {
    const where = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { code: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return { items, meta: paginationMeta(total, page, pageSize) };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(dto: CreateClientDto, actorUserId: string) {
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const nameNormalized = normalizeClientName(name);
    const existing = await this.prisma.client.findUnique({
      where: { nameNormalized },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Client name already exists');
    }
    try {
      const client =
        existing?.deletedAt
          ? await this.prisma.client.update({
              where: { id: existing.id },
              data: {
                name,
                nameNormalized,
                code: dto.code ?? null,
                isActive: dto.isActive ?? true,
                deletedAt: null,
              },
            })
          : await this.prisma.client.create({
              data: {
                name,
                nameNormalized,
                code: dto.code ?? null,
                isActive: dto.isActive ?? true,
              },
            });
      await this.audit.record({
        actorUserId,
        action: 'CREATE',
        entityType: 'Client',
        entityId: client.id,
        after: client,
      });
      return client;
    } catch (e) {
      throwConflictIfUnique(e, 'Client name or code already exists');
    }
  }

  async update(id: string, dto: UpdateClientDto, actorUserId: string) {
    const before = await this.findOne(id);
    const data: {
      name?: string;
      nameNormalized?: string;
      code?: string | null;
      isActive?: boolean;
    } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim().replace(/\s+/g, ' ');
      data.name = name;
      data.nameNormalized = normalizeClientName(name);
      const clash = await this.prisma.client.findUnique({
        where: { nameNormalized: data.nameNormalized },
      });
      if (clash && clash.id !== id && !clash.deletedAt) {
        throw new ConflictException('Client name already exists');
      }
    }
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    try {
      const client = await this.prisma.client.update({
        where: { id },
        data,
      });
      await this.audit.record({
        actorUserId,
        action: 'UPDATE',
        entityType: 'Client',
        entityId: client.id,
        before,
        after: client,
      });
      return client;
    } catch (e) {
      throwConflictIfUnique(e, 'Client name or code already exists');
    }
  }

  async softDelete(id: string, actorUserId: string) {
    const before = await this.findOne(id);
    const client = await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record({
      actorUserId,
      action: 'DELETE',
      entityType: 'Client',
      entityId: client.id,
      before,
      after: client,
    });
    return { success: true };
  }
}
