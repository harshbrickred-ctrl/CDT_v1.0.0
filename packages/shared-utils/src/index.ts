const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Inclusive calendar day count between two dates (UTC date parts). */
export function inclusiveCalendarDays(from: Date, to: Date): number {
  const start = toUtcDateOnly(from);
  const end = toUtcDateOnly(to);
  const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return diff + 1;
}

/**
 * Inclusive overlap in calendar days between a leave window and a period.
 * Returns 0 when there is no overlap.
 */
export function overlapInclusiveDays(
  leaveFrom: Date,
  leaveTo: Date,
  periodStart: Date,
  periodEnd: Date,
): number {
  const a = toUtcDateOnly(leaveFrom);
  const b = toUtcDateOnly(leaveTo);
  const c = toUtcDateOnly(periodStart);
  const d = toUtcDateOnly(periodEnd);
  const start = a.getTime() > c.getTime() ? a : c;
  const end = b.getTime() < d.getTime() ? b : d;
  if (end.getTime() < start.getTime()) return 0;
  return inclusiveCalendarDays(start, end);
}

export type LeaveLike = {
  status: string;
  from: Date;
  to: Date;
};

/** Sum leave days overlapping the period (inclusive), optionally filtered by status. */
export function sumOverlappingLeaveDays(
  leaves: LeaveLike[],
  periodStart: Date,
  periodEnd: Date,
  statuses?: readonly string[],
): number {
  return leaves
    .filter((l) => !statuses || statuses.includes(l.status))
    .reduce(
      (sum, l) =>
        sum + overlapInclusiveDays(l.from, l.to, periodStart, periodEnd),
      0,
    );
}

/** Sum approved leave days overlapping the period (inclusive). */
export function sumApprovedLeaveDays(
  leaves: LeaveLike[],
  periodStart: Date,
  periodEnd: Date,
): number {
  return sumOverlappingLeaveDays(leaves, periodStart, periodEnd, ['APPROVED']);
}

/**
 * Timesheet leave vs LOP for a period:
 * - leaveDays: APPROVED leave (paid/approved time off; not LOP)
 * - lopDays: PENDING or REJECTED leave (unapproved → loss of pay)
 */
export function computeLeaveAndLopDays(
  leaves: LeaveLike[],
  periodStart: Date,
  periodEnd: Date,
): { leaveDays: number; lopDays: number } {
  return {
    leaveDays: sumOverlappingLeaveDays(leaves, periodStart, periodEnd, [
      'APPROVED',
    ]),
    lopDays: sumOverlappingLeaveDays(leaves, periodStart, periodEnd, [
      'PENDING',
      'REJECTED',
    ]),
  };
}

/**
 * Attendance percentage rounded to 1 decimal.
 * Returns null when workingDays <= 0.
 */
export function attendancePct(
  daysWorked: number,
  workingDays: number,
): number | null {
  if (workingDays <= 0) return null;
  return Math.round((daysWorked / workingDays) * 1000) / 10;
}

/** Format a public business id, e.g. formatPublicId('CD', 1) => 'CD-00001'. */
export function formatPublicId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(5, '0')}`;
}

/** Normalize client name for uniqueness: trim, collapse spaces, lower-case. */
export function normalizeClientName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Invoice budget: hourlyRate × hoursPerDay × daysWorked, rounded to 2 decimals. */
export function invoiceAmount(
  hourlyRate: number,
  hoursPerDay: number,
  daysWorked: number,
): number {
  return Math.round(hourlyRate * hoursPerDay * daysWorked * 100) / 100;
}

export type BillingTypeCode = 'HOURLY' | 'FIXED';

export type ComputeInvoiceBillingInput = {
  billingType: BillingTypeCode;
  hourlyRate?: number | null;
  hoursPerDay?: number | null;
  monthlyFixedAmount?: number | null;
  maxBillableHours?: number | null;
  workingDays: number;
  lopDays: number;
};

export type ComputeInvoiceBillingResult = {
  billableDays: number;
  rawHours: number;
  billableHours: number;
  amount: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Invoice amount with LOP + optional Hourly max-hours cap.
 * FIXED pro-rates by billableDays/workingDays; maxBillableHours does not change FIXED amount.
 */
export function computeInvoiceBilling(
  input: ComputeInvoiceBillingInput,
): ComputeInvoiceBillingResult {
  const hoursPerDay = input.hoursPerDay ?? 8;
  const workingDays = Math.max(0, input.workingDays);
  const lopDays = Math.max(0, input.lopDays);
  const billableDays = Math.max(0, workingDays - lopDays);
  const rawHours = round2(billableDays * hoursPerDay);

  let billableHours = rawHours;
  if (
    input.billingType === 'HOURLY' &&
    input.maxBillableHours != null &&
    input.maxBillableHours > 0
  ) {
    billableHours = round2(Math.min(rawHours, input.maxBillableHours));
  }

  let amount = 0;
  if (input.billingType === 'FIXED') {
    const fixed = input.monthlyFixedAmount ?? 0;
    amount =
      workingDays > 0
        ? round2(fixed * (billableDays / workingDays))
        : 0;
  } else {
    const rate = input.hourlyRate ?? 0;
    amount = round2(rate * billableHours);
  }

  return { billableDays, rawHours, billableHours, amount };
}

/** Leave type codes treated as LOP for billing. */
export const LOP_LEAVE_TYPE_CODES = ['UNPAID', 'LOP'] as const;

export function isLopLeaveType(code: string): boolean {
  return (LOP_LEAVE_TYPE_CODES as readonly string[]).includes(code);
}
