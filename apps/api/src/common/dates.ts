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

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
