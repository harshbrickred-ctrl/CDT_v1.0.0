export const COST_CENTER_CODES = ['BRICKRED', 'AGYOM'] as const;
export type CostCenterCode = (typeof COST_CENTER_CODES)[number];

export function isCostCenterCode(value: string): value is CostCenterCode {
  return (COST_CENTER_CODES as readonly string[]).includes(value);
}
