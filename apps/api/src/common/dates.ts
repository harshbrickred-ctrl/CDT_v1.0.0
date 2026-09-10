/** Parse YYYY-MM into UTC period start/end (inclusive calendar month). */
export function periodFromYearMonth(yearMonth: string): {
  periodStart: Date;
  periodEnd: Date;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  return { periodStart, periodEnd };
}

/** UTC date-only for "today". */
export function utcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Previous calendar month as YYYY-MM. */
export function previousYearMonth(yearMonth: string): string {
  const { periodStart } = periodFromYearMonth(yearMonth);
  const y = periodStart.getUTCFullYear();
  const m = periodStart.getUTCMonth(); // 0-based
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const mm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  return `${prev.getUTCFullYear()}-${mm}`;
}

/** Last calendar day of the previous UTC month relative to `asOf`. */
export function previousMonthEndDate(asOf: Date = utcToday()): Date {
  return new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 0));
}

/** Format a UTC date as YYYY-MM. */
export function yearMonthFromDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}`;
}

/** Inclusive list of YYYY-MM from start..end (UTC month boundaries). */
export function yearMonthsBetween(from: Date, to: Date): string[] {
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  if (end < start) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(yearMonthFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

/**
 * End date through which timesheet months are considered due.
 *
 * Timesheets are filled for the previous month (e.g. August is filled in
 * September), so ACTIVE candidates are only due through the prior month.
 * RELEASED candidates include their release/contract-end month immediately,
 * even when that month is the current calendar month.
 */
export function timesheetDueEndDate(
  candidate: {
    status: string;
    contractEndDate?: Date | null;
    releasedAt?: Date | null;
  },
  asOf: Date = utcToday(),
): Date | null {
  const employmentEnd = candidate.contractEndDate ?? candidate.releasedAt ?? null;

  if (candidate.status === 'RELEASED') {
    return employmentEnd;
  }

  const prevMonthEnd = previousMonthEndDate(asOf);
  if (employmentEnd && employmentEnd < prevMonthEnd) {
    return employmentEnd;
  }
  return prevMonthEnd;
}

/** Due timesheet months (join → due end) for a candidate as of `asOf`. */
export function dueTimesheetMonths(
  candidate: {
    status: string;
    joinedOn?: Date | null;
    contractEndDate?: Date | null;
    releasedAt?: Date | null;
  },
  asOf: Date = utcToday(),
): string[] {
  const end = timesheetDueEndDate(candidate, asOf);
  if (!end) return [];
  const start = candidate.joinedOn ?? end;
  return yearMonthsBetween(start, end);
}

/** Due months that have no timesheet row. */
export function missingDueTimesheetMonths(
  candidate: {
    status: string;
    joinedOn?: Date | null;
    contractEndDate?: Date | null;
    releasedAt?: Date | null;
  },
  existingYearMonths: Iterable<string>,
  asOf: Date = utcToday(),
): string[] {
  const have = existingYearMonths instanceof Set
    ? existingYearMonths
    : new Set(existingYearMonths);
  return dueTimesheetMonths(candidate, asOf).filter((m) => !have.has(m));
}

/**
 * Candidate was employed some day in [periodStart, periodEnd]:
 * joinedOn <= periodEnd (or joinedOn null), and end date null or >= periodStart.
 * Caller should also set deletedAt / status / org filters.
 */
export function candidateEmployedInPeriodWhere(
  periodStart: Date,
  periodEnd: Date,
): Record<string, unknown> {
  return {
    OR: [{ joinedOn: null }, { joinedOn: { lte: periodEnd } }],
    AND: [
      {
        OR: [
          { contractEndDate: null, releasedAt: null },
          { contractEndDate: { gte: periodStart } },
          {
            contractEndDate: null,
            releasedAt: { gte: periodStart },
          },
        ],
      },
    ],
  };
}

export function isCandidateEmployedInPeriod(
  candidate: {
    joinedOn?: Date | null;
    contractEndDate?: Date | null;
    releasedAt?: Date | null;
  },
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (candidate.joinedOn && candidate.joinedOn > periodEnd) return false;
  const end = candidate.contractEndDate ?? candidate.releasedAt ?? null;
  if (end && end < periodStart) return false;
  return true;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
