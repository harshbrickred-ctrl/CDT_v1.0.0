import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function throwConflictIfUnique(
  error: unknown,
  message = 'Resource already exists',
): never {
  if (isUniqueConflict(error)) {
    throw new ConflictException(message);
  }
  throw error;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
