import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecordInput = {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityPublicId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityPublicId: input.entityPublicId ?? null,
        beforeJson:
          input.before === undefined
            ? undefined
            : (input.before as Prisma.InputJsonValue),
        afterJson:
          input.after === undefined
            ? undefined
            : (input.after as Prisma.InputJsonValue),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findAll(params: {
    organizationId: string;
    page?: number;
    pageSize?: number;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    action?: string;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      organizationId: params.organizationId,
    };
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.action) where.action = params.action;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
        include: {
          actor: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
      }),
    ]);

    const mapped = items.map((row) => ({
      ...row,
      actorName: row.actor?.fullName ?? null,
      actorEmail: row.actor?.email ?? null,
    }));

    return { items: mapped, meta: paginationMeta(total, page, pageSize) };
  }
}
