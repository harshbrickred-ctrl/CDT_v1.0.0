import { describe, expect, it } from 'vitest';
import {
  attendancePct,
  computeInvoiceBilling,
  computeLeaveAndLopDays,
  formatPublicId,
  inclusiveCalendarDays,
  invoiceAmount,
  isLopLeaveType,
  normalizeClientName,
  overlapInclusiveDays,
  sumApprovedLeaveDays,
} from './index';

describe('inclusiveCalendarDays', () => {
  it('counts single day as 1', () => {
    const d = new Date(Date.UTC(2025, 6, 1));
    expect(inclusiveCalendarDays(d, d)).toBe(1);
  });

  it('counts inclusive range', () => {
    const from = new Date(Date.UTC(2025, 6, 1));
    const to = new Date(Date.UTC(2025, 6, 3));
    expect(inclusiveCalendarDays(from, to)).toBe(3);
  });
});

describe('overlapInclusiveDays', () => {
  it('returns full leave when inside period', () => {
    const leaveFrom = new Date(Date.UTC(2025, 6, 10));
    const leaveTo = new Date(Date.UTC(2025, 6, 12));
    const periodStart = new Date(Date.UTC(2025, 6, 1));
    const periodEnd = new Date(Date.UTC(2025, 6, 31));
    expect(overlapInclusiveDays(leaveFrom, leaveTo, periodStart, periodEnd)).toBe(3);
  });

  it('clips leave to period bounds', () => {
    const leaveFrom = new Date(Date.UTC(2025, 5, 28));
    const leaveTo = new Date(Date.UTC(2025, 6, 2));
    const periodStart = new Date(Date.UTC(2025, 6, 1));
    const periodEnd = new Date(Date.UTC(2025, 6, 31));
    expect(overlapInclusiveDays(leaveFrom, leaveTo, periodStart, periodEnd)).toBe(2);
  });

  it('returns 0 when no overlap', () => {
    const leaveFrom = new Date(Date.UTC(2025, 5, 1));
    const leaveTo = new Date(Date.UTC(2025, 5, 5));
    const periodStart = new Date(Date.UTC(2025, 6, 1));
    const periodEnd = new Date(Date.UTC(2025, 6, 31));
    expect(overlapInclusiveDays(leaveFrom, leaveTo, periodStart, periodEnd)).toBe(0);
  });
});

describe('sumApprovedLeaveDays', () => {
  const periodStart = new Date(Date.UTC(2025, 6, 1));
  const periodEnd = new Date(Date.UTC(2025, 6, 31));

  it('sums only APPROVED leaves', () => {
    const leaves = [
      {
        status: 'APPROVED',
        from: new Date(Date.UTC(2025, 6, 1)),
        to: new Date(Date.UTC(2025, 6, 2)),
      },
      {
        status: 'PENDING',
        from: new Date(Date.UTC(2025, 6, 5)),
        to: new Date(Date.UTC(2025, 6, 10)),
      },
      {
        status: 'REJECTED',
        from: new Date(Date.UTC(2025, 6, 15)),
        to: new Date(Date.UTC(2025, 6, 16)),
      },
    ];
    expect(sumApprovedLeaveDays(leaves, periodStart, periodEnd)).toBe(2);
  });
});

describe('computeLeaveAndLopDays', () => {
  const periodStart = new Date(Date.UTC(2025, 6, 1));
  const periodEnd = new Date(Date.UTC(2025, 6, 31));

  it('treats approved leave as leaveDays and unapproved as lopDays', () => {
    const leaves = [
      {
        status: 'APPROVED',
        from: new Date(Date.UTC(2025, 6, 1)),
        to: new Date(Date.UTC(2025, 6, 2)),
      },
      {
        status: 'PENDING',
        from: new Date(Date.UTC(2025, 6, 5)),
        to: new Date(Date.UTC(2025, 6, 6)),
      },
      {
        status: 'REJECTED',
        from: new Date(Date.UTC(2025, 6, 10)),
        to: new Date(Date.UTC(2025, 6, 10)),
      },
    ];
    expect(computeLeaveAndLopDays(leaves, periodStart, periodEnd)).toEqual({
      leaveDays: 2,
      lopDays: 3,
    });
  });

  it('does not treat approved unpaid leave as LOP', () => {
    const leaves = [
      {
        status: 'APPROVED',
        from: new Date(Date.UTC(2025, 6, 1)),
        to: new Date(Date.UTC(2025, 6, 3)),
        leaveTypeCode: 'UNPAID',
      },
    ];
    expect(computeLeaveAndLopDays(leaves, periodStart, periodEnd)).toEqual({
      leaveDays: 3,
      lopDays: 0,
    });
  });
});

describe('attendancePct', () => {
  it('returns 91.3 for July 21/23', () => {
    expect(attendancePct(21, 23)).toBe(91.3);
  });

  it('returns null when workingDays <= 0', () => {
    expect(attendancePct(5, 0)).toBeNull();
    expect(attendancePct(5, -1)).toBeNull();
  });

  it('rounds to one decimal', () => {
    expect(attendancePct(1, 3)).toBe(33.3);
  });
});

describe('formatPublicId', () => {
  it('pads to 5 digits', () => {
    expect(formatPublicId('CD', 1)).toBe('CD-00001');
    expect(formatPublicId('LV', 42)).toBe('LV-00042');
  });
});

describe('normalizeClientName', () => {
  it('trims, collapses spaces, lowercases', () => {
    expect(normalizeClientName('  Acme   Corp ')).toBe('acme corp');
  });
});

describe('invoiceAmount', () => {
  it('computes hourlyRate * hoursPerDay * daysWorked', () => {
    expect(invoiceAmount(1000, 8, 20)).toBe(160000);
  });
});

describe('computeInvoiceBilling', () => {
  it('hourly bills rate × billable hours after LOP', () => {
    const r = computeInvoiceBilling({
      billingType: 'HOURLY',
      hourlyRate: 1000,
      hoursPerDay: 8,
      workingDays: 22,
      lopDays: 2,
    });
    expect(r.billableDays).toBe(20);
    expect(r.rawHours).toBe(160);
    expect(r.billableHours).toBe(160);
    expect(r.amount).toBe(160000);
  });

  it('hourly caps billable hours at maxBillableHours', () => {
    const r = computeInvoiceBilling({
      billingType: 'HOURLY',
      hourlyRate: 1000,
      hoursPerDay: 8,
      maxBillableHours: 150,
      workingDays: 22,
      lopDays: 0,
    });
    expect(r.rawHours).toBe(176);
    expect(r.billableHours).toBe(150);
    expect(r.amount).toBe(150000);
  });

  it('fixed pro-rates by billableDays / workingDays', () => {
    const r = computeInvoiceBilling({
      billingType: 'FIXED',
      monthlyFixedAmount: 100000,
      hoursPerDay: 8,
      workingDays: 22,
      lopDays: 2,
    });
    expect(r.billableDays).toBe(20);
    expect(r.amount).toBe(90909.09);
  });

  it('fixed ignores maxBillableHours for amount', () => {
    const r = computeInvoiceBilling({
      billingType: 'FIXED',
      monthlyFixedAmount: 100000,
      hoursPerDay: 8,
      maxBillableHours: 150,
      workingDays: 22,
      lopDays: 0,
    });
    expect(r.rawHours).toBe(176);
    expect(r.billableHours).toBe(176);
    expect(r.amount).toBe(100000);
  });
});

describe('isLopLeaveType', () => {
  it('treats UNPAID and LOP as LOP', () => {
    expect(isLopLeaveType('UNPAID')).toBe(true);
    expect(isLopLeaveType('LOP')).toBe(true);
    expect(isLopLeaveType('CASUAL')).toBe(false);
  });
});
