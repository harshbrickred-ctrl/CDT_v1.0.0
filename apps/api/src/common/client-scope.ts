import { ForbiddenException } from '@nestjs/common';
import { ClientOwnershipRole, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './decorators/current-user.decorator';

/**
 * null = ADMIN (unscoped / all clients in org).
 * string[] = owned client IDs for Delivery/Account Owner (may be empty).
 */
export async function resolveOwnedClientIds(
  prisma: PrismaService,
  user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
): Promise<string[] | null> {
  if (user.role === Role.ADMIN || user.role === 'ADMIN') {
    return null;
  }
  const rows = await prisma.clientOwnership.findMany({
    where: {
      organizationId: user.organizationId,
      userId: user.id,
      client: { deletedAt: null },
    },
    select: { clientId: true },
  });
  return [...new Set(rows.map((r) => r.clientId))];
}

/**
 * ADMIN dashboard owner filters.
 * null = no owner filter applied.
 * string[] = client IDs (may be empty when intersection has no overlap).
 */
export async function resolveClientIdsForOwnerFilters(
  prisma: PrismaService,
  params: {
    organizationId: string;
    deliveryOwnerUserId?: string;
    accountOwnerUserId?: string;
  },
): Promise<string[] | null> {
  const deliveryOwnerUserId = params.deliveryOwnerUserId?.trim() || undefined;
  const accountOwnerUserId = params.accountOwnerUserId?.trim() || undefined;
  if (!deliveryOwnerUserId && !accountOwnerUserId) {
    return null;
  }

  async function clientIdsFor(
    userId: string,
    ownershipRole: ClientOwnershipRole,
  ): Promise<string[]> {
    const rows = await prisma.clientOwnership.findMany({
      where: {
        organizationId: params.organizationId,
        userId,
        ownershipRole,
        client: { deletedAt: null },
      },
      select: { clientId: true },
    });
    return [...new Set(rows.map((r) => r.clientId))];
  }

  if (deliveryOwnerUserId && accountOwnerUserId) {
    const [doIds, aoIds] = await Promise.all([
      clientIdsFor(deliveryOwnerUserId, ClientOwnershipRole.DELIVERY_OWNER),
      clientIdsFor(accountOwnerUserId, ClientOwnershipRole.ACCOUNT_OWNER),
    ]);
    const aoSet = new Set(aoIds);
    return doIds.filter((id) => aoSet.has(id));
  }
  if (deliveryOwnerUserId) {
    return clientIdsFor(
      deliveryOwnerUserId,
      ClientOwnershipRole.DELIVERY_OWNER,
    );
  }
  return clientIdsFor(
    accountOwnerUserId!,
    ClientOwnershipRole.ACCOUNT_OWNER,
  );
}

export function assertClientAccess(
  ownedClientIds: string[] | null,
  clientId: string,
  message = 'You do not have access to this client',
): void {
  if (ownedClientIds === null) return;
  if (!ownedClientIds.includes(clientId)) {
    throw new ForbiddenException(message);
  }
}

/** Restrict a direct clientId filter on Candidate/Client-style where. */
export function withClientIdScope(
  ownedClientIds: string[] | null,
  requestedClientId?: string,
): Prisma.StringFilter | string | undefined {
  if (ownedClientIds === null) {
    return requestedClientId || undefined;
  }
  if (ownedClientIds.length === 0) {
    // Match nothing
    return { in: [] };
  }
  if (requestedClientId) {
    if (!ownedClientIds.includes(requestedClientId)) {
      return { in: [] };
    }
    return requestedClientId;
  }
  return { in: ownedClientIds };
}

/** Restrict via candidate.clientId nested filter. */
export function withCandidateClientScope(
  ownedClientIds: string[] | null,
  requestedClientId?: string,
): Prisma.CandidateWhereInput | undefined {
  const clientId = withClientIdScope(ownedClientIds, requestedClientId);
  if (clientId === undefined) return undefined;
  return { clientId };
}

export function emptyIfNoAccess(ownedClientIds: string[] | null): boolean {
  return ownedClientIds !== null && ownedClientIds.length === 0;
}
