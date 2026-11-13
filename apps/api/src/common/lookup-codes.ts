import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'lookupType' | 'lookupValue'>;

export async function findActiveLookupValue(
  prisma: PrismaLike,
  typeCode: string,
  code: string,
) {
  const type = await prisma.lookupType.findUnique({
    where: { code: typeCode.trim().toUpperCase() },
    select: { id: true },
  });
  if (!type) return null;
  return prisma.lookupValue.findFirst({
    where: {
      typeId: type.id,
      code: code.trim().toUpperCase(),
      isActive: true,
    },
    select: { id: true, code: true, label: true },
  });
}

export async function assertActiveLookupCode(
  prisma: PrismaLike,
  typeCode: string,
  code: string,
  fieldLabel: string,
): Promise<string> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} is required`);
  }
  const found = await findActiveLookupValue(prisma, typeCode, normalized);
  if (!found) {
    throw new BadRequestException(
      `${fieldLabel} must be an active ${typeCode} lookup value`,
    );
  }
  return found.code;
}

export async function listActiveLookupCodes(
  prisma: PrismaLike,
  typeCode: string,
): Promise<string[]> {
  const type = await prisma.lookupType.findUnique({
    where: { code: typeCode.trim().toUpperCase() },
    select: {
      values: {
        where: { isActive: true },
        select: { code: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      },
    },
  });
  return type?.values.map((v) => v.code) ?? [];
}
