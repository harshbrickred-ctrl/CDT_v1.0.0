import { PrismaClient } from '@prisma/client';
import { assertActiveLookupCode, findActiveLookupValue } from './lookup-codes';

/** Built-in codes used for shell branding fallbacks. */
export const COST_CENTER_CODES = ['BRICKRED', 'AGYOM'] as const;
export type CostCenterCode = (typeof COST_CENTER_CODES)[number];

export function isCostCenterCode(value: string): value is CostCenterCode {
  return (COST_CENTER_CODES as readonly string[]).includes(value);
}

type PrismaLike = Pick<PrismaClient, 'lookupType' | 'lookupValue'>;

export async function assertCostCenterCode(
  prisma: PrismaLike,
  code: string,
): Promise<string> {
  return assertActiveLookupCode(prisma, 'COST_CENTER', code, 'Cost center');
}

export async function isActiveCostCenterCode(
  prisma: PrismaLike,
  code: string,
): Promise<boolean> {
  const found = await findActiveLookupValue(prisma, 'COST_CENTER', code);
  return Boolean(found);
}
