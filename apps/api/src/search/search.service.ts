import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, q: string, limit = 20) {
    const query = q?.trim() ?? '';
    if (!query) {
      return { candidates: [], clients: [] };
    }

    const [candidates, clients] = await Promise.all([
      this.prisma.candidate.findMany({
        where: {
          organizationId,
          deletedAt: null,
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
          organizationId,
          deletedAt: null,
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
