import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withClientIdScope,
  withCostCenterFilter,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    q: string,
    limit = 20,
    costCenter?: string,
  ) {
    const query = q?.trim() ?? '';
    if (!query) {
      return { candidates: [], clients: [] };
    }

    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return { candidates: [], clients: [] };
    }
    const clientFilter = withClientIdScope(ownedClientIds);
    const cc = withCostCenterFilter(costCenter);

    const [candidates, clients] = await Promise.all([
      this.prisma.candidate.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          ...(clientFilter ? { clientId: clientFilter } : {}),
          ...(cc ? { costCenter: cc } : {}),
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { publicId: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          publicId: true,
          fullName: true,
          status: true,
          client: { select: { id: true, name: true } },
        },
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.client.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          ...(clientFilter ? { id: clientFilter } : {}),
          ...(cc ? { costCenter: cc } : {}),
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return { candidates, clients };
  }
}
