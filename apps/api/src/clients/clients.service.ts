import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ClientOwnershipRole, Role } from '@prisma/client';
import { normalizeClientName } from '@cdt/shared-utils';
import { paginationMeta, paginationSkip } from '@cdt/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';
import {
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withClientIdScope,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { throwConflictIfUnique } from '../common/prisma-error';
import { AuditService } from '../audit/audit.service';

const ownershipInclude = {
  ownerships: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private serialize<
    T extends {
      ownerships?: Array<{
        ownershipRole: ClientOwnershipRole;
        user: {
          id: string;
          fullName: string;
          email: string;
          role: Role;
        };
      }>;
    },
  >(client: T) {
    const ownerships = client.ownerships ?? [];
    const { ownerships: _omit, ...rest } = client;
    return {
      ...rest,
      deliveryOwners: ownerships
        .filter((o) => o.ownershipRole === ClientOwnershipRole.DELIVERY_OWNER)
        .map((o) => o.user),
      accountOwners: ownerships
        .filter((o) => o.ownershipRole === ClientOwnershipRole.ACCOUNT_OWNER)
        .map((o) => o.user),
    };
  }

  private async assertOwnerUsers(
    organizationId: string,
    userIds: string[],
    expectedRole: Role,
  ) {
    if (!userIds.length) return;
    const unique = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        id: { in: unique },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, role: true },
    });
    if (users.length !== unique.length) {
      throw new BadRequestException('One or more owner users were not found');
    }
    for (const u of users) {
      if (u.role !== expectedRole) {
        throw new BadRequestException(
          `User ${u.id} must have role ${expectedRole}`,
        );
      }
    }
  }

  private async replaceOwnerships(
    organizationId: string,
    clientId: string,
    deliveryOwnerUserIds: string[] | undefined,
    accountOwnerUserIds: string[] | undefined,
  ) {
    if (deliveryOwnerUserIds === undefined && accountOwnerUserIds === undefined) {
      return;
    }

    if (deliveryOwnerUserIds !== undefined) {
      await this.assertOwnerUsers(
        organizationId,
        deliveryOwnerUserIds,
        Role.DELIVERY_OWNER,
      );
    }
    if (accountOwnerUserIds !== undefined) {
      await this.assertOwnerUsers(
        organizationId,
        accountOwnerUserIds,
        Role.ACCOUNT_OWNER,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (deliveryOwnerUserIds !== undefined) {
        await tx.clientOwnership.deleteMany({
          where: {
            clientId,
            ownershipRole: ClientOwnershipRole.DELIVERY_OWNER,
          },
        });
        if (deliveryOwnerUserIds.length) {
          await tx.clientOwnership.createMany({
            data: [...new Set(deliveryOwnerUserIds)].map((userId) => ({
              organizationId,
              clientId,
              userId,
              ownershipRole: ClientOwnershipRole.DELIVERY_OWNER,
            })),
          });
        }
      }
      if (accountOwnerUserIds !== undefined) {
        await tx.clientOwnership.deleteMany({
          where: {
            clientId,
            ownershipRole: ClientOwnershipRole.ACCOUNT_OWNER,
          },
        });
        if (accountOwnerUserIds.length) {
          await tx.clientOwnership.createMany({
            data: [...new Set(accountOwnerUserIds)].map((userId) => ({
              organizationId,
              clientId,
              userId,
              ownershipRole: ClientOwnershipRole.ACCOUNT_OWNER,
            })),
          });
        }
        await this.syncCandidateAccountManagers(tx, organizationId, clientId);
      }
    });
  }

  private async syncCandidateAccountManagers(
    tx: Prisma.TransactionClient,
    organizationId: string,
    clientId: string,
  ) {
    const aos = await tx.clientOwnership.findMany({
      where: {
        clientId,
        ownershipRole: ClientOwnershipRole.ACCOUNT_OWNER,
      },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    });
    const aoIds = aos.map((a) => a.userId);
    const primaryAo = aoIds[0] ?? null;

    const candidates = await tx.candidate.findMany({
      where: { organizationId, clientId, deletedAt: null },
      select: { id: true, accountManagerUserId: true },
    });

    for (const c of candidates) {
      const stillValid =
        c.accountManagerUserId != null &&
        aoIds.includes(c.accountManagerUserId);
      if (!stillValid) {
        await tx.candidate.update({
          where: { id: c.id },
          data: { accountManagerUserId: primaryAo },
        });
      }
    }
  }

  async findAll(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    page = 1,
    pageSize = 20,
    q?: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return { items: [], meta: paginationMeta(0, page, pageSize) };
    }
    const idFilter = withClientIdScope(ownedClientIds);
    const where = {
      organizationId: user.organizationId,
      deletedAt: null,
      ...(idFilter ? { id: idFilter } : {}),
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
        include: ownershipInclude,
        orderBy: { name: 'asc' },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((c) => this.serialize(c)),
      meta: paginationMeta(total, page, pageSize),
    };
  }

  async findOne(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    id: string,
  ) {
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      throw new NotFoundException('Client not found');
    }
    const idFilter = withClientIdScope(ownedClientIds, id);
    const client = await this.prisma.client.findFirst({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...(idFilter ? { id: idFilter } : { id }),
      },
      include: ownershipInclude,
    });
    if (!client) throw new NotFoundException('Client not found');
    return this.serialize(client);
  }

  async create(user: AuthUser, dto: CreateClientDto) {
    const organizationId = user.organizationId;
    const wantsOwners =
      dto.deliveryOwnerUserIds !== undefined ||
      dto.accountOwnerUserIds !== undefined;
    if (wantsOwners && user.role !== Role.ADMIN && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can assign client owners');
    }

    const name = dto.name.trim().replace(/\s+/g, ' ');
    const nameNormalized = normalizeClientName(name);
    const existing = await this.prisma.client.findUnique({
      where: {
        organizationId_nameNormalized: { organizationId, nameNormalized },
      },
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
                organizationId,
                name,
                nameNormalized,
                code: dto.code ?? null,
                isActive: dto.isActive ?? true,
              },
            });

      await this.replaceOwnerships(
        organizationId,
        client.id,
        dto.deliveryOwnerUserIds,
        dto.accountOwnerUserIds,
      );

      const full = await this.prisma.client.findFirstOrThrow({
        where: { id: client.id },
        include: ownershipInclude,
      });

      await this.audit.record({
        organizationId,
        actorUserId: user.id,
        action: 'CREATE',
        entityType: 'Client',
        entityId: client.id,
        after: full,
      });
      return this.serialize(full);
    } catch (e) {
      throwConflictIfUnique(e, 'Client name or code already exists');
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateClientDto) {
    const organizationId = user.organizationId;
    const wantsOwners =
      dto.deliveryOwnerUserIds !== undefined ||
      dto.accountOwnerUserIds !== undefined;
    if (wantsOwners && user.role !== Role.ADMIN && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can assign client owners');
    }

    const before = await this.findOne(user, id);
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
        where: {
          organizationId_nameNormalized: {
            organizationId,
            nameNormalized: data.nameNormalized,
          },
        },
      });
      if (clash && clash.id !== id && !clash.deletedAt) {
        throw new ConflictException('Client name already exists');
      }
    }
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    try {
      await this.prisma.client.update({
        where: { id },
        data,
      });
      await this.replaceOwnerships(
        organizationId,
        id,
        dto.deliveryOwnerUserIds,
        dto.accountOwnerUserIds,
      );
      const client = await this.prisma.client.findFirstOrThrow({
        where: { id },
        include: ownershipInclude,
      });
      await this.audit.record({
        organizationId,
        actorUserId: user.id,
        action: 'UPDATE',
        entityType: 'Client',
        entityId: client.id,
        before,
        after: client,
      });
      return this.serialize(client);
    } catch (e) {
      throwConflictIfUnique(e, 'Client name or code already exists');
    }
  }

  async softDelete(user: AuthUser, id: string) {
    const before = await this.findOne(user, id);
    const client = await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'DELETE',
      entityType: 'Client',
      entityId: client.id,
      before,
      after: client,
    });
    return { success: true };
  }
}
