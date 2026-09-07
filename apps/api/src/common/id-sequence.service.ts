import { Injectable } from '@nestjs/common';
import { formatPublicId } from '@cdt/shared-utils';
import { PrismaService } from '../prisma/prisma.service';

export type IdPrefix = 'CD' | 'LV' | 'TSH' | 'DEL' | 'INV';

@Injectable()
export class IdSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async allocateNext(prefix: IdPrefix): Promise<string> {
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.idSequence.findUnique({ where: { prefix } });
      if (!current) {
        await tx.idSequence.create({ data: { prefix, nextValue: 2 } });
        return 1;
      }
      const n = current.nextValue;
      await tx.idSequence.update({
        where: { prefix },
        data: { nextValue: n + 1 },
      });
      return n;
    });
    return formatPublicId(prefix, row);
  }
}
