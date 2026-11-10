import { BadRequestException } from '@nestjs/common';
import {
  CandidateStatus,
  EmployeeCategory,
  EmployeeTeam,
} from '@prisma/client';
import { utcToday } from '../common/dates';

export const SUPPORT_FUNCTIONS = [
  'HR',
  'TA',
  'ACCOUNTS',
  'ADMIN',
  'FINANCE',
] as const;
export type SupportFunction = (typeof SUPPORT_FUNCTIONS)[number];

export type CategoryFieldInput = {
  category: EmployeeCategory;
  clientId?: string | null;
  team?: EmployeeTeam | null;
  supportFunction?: string | null;
  salesOwnerUserId?: string | null;
  benchStartDate?: string | Date | null;
  interviewsScheduledCount?: number | null;
};

export type NormalizedEmployeeCategory = {
  category: EmployeeCategory;
  clientId: string | null;
  team: EmployeeTeam | null;
  supportFunction: string | null;
  salesOwnerUserId: string | null;
  benchStartDate: Date | null;
  interviewsScheduledCount: number;
};

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('benchStartDate must be a date');
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) {
    throw new BadRequestException('benchStartDate must be a date');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('benchStartDate must be a date');
  }
  return date;
}

function resolveSupportFunction(
  team: EmployeeTeam | null,
  supportFunction: string | null | undefined,
): string | null {
  const value = blankToNull(supportFunction)?.toUpperCase() ?? null;
  if (!team) {
    if (value) {
      throw new BadRequestException('Role is only allowed when a team is set');
    }
    return null;
  }
  if (!value) {
    if (team === EmployeeTeam.SUPPORT) {
      throw new BadRequestException(
        'Role is required when team is SUPPORT',
      );
    }
    return null;
  }
  if (!SUPPORT_FUNCTIONS.includes(value as SupportFunction)) {
    throw new BadRequestException(
      'Role must be HR, TA, ACCOUNTS, ADMIN, or FINANCE',
    );
  }
  return value;
}

/**
 * Apply the target category's field rules. Billing columns are not part of
 * this result and must be left unchanged by the caller.
 */
export function normalizeEmployeeCategory(
  input: CategoryFieldInput,
  today: Date = utcToday(),
): NormalizedEmployeeCategory {
  const category = input.category;
  if (!category) {
    throw new BadRequestException('category is required');
  }

  if (category === EmployeeCategory.BILLABLE) {
    const clientId = blankToNull(input.clientId);
    if (!clientId) {
      throw new BadRequestException(
        'A billable employee requires a client',
      );
    }
    return {
      category,
      clientId,
      team: null,
      supportFunction: null,
      salesOwnerUserId: blankToNull(input.salesOwnerUserId),
      benchStartDate: null,
      interviewsScheduledCount: 0,
    };
  }

  if (category === EmployeeCategory.NON_BILLABLE) {
    if (!input.team) {
      throw new BadRequestException(
        'A non-billable employee requires a team',
      );
    }
    return {
      category,
      clientId: null,
      team: input.team,
      supportFunction: resolveSupportFunction(input.team, input.supportFunction),
      salesOwnerUserId: null,
      benchStartDate: null,
      interviewsScheduledCount: 0,
    };
  }

  if (category === EmployeeCategory.BENCH) {
    const team = input.team ?? null;
    const benchStartDate = input.benchStartDate
      ? parseDateOnly(input.benchStartDate)
      : today;
    const interviews = input.interviewsScheduledCount ?? 0;
    if (!Number.isInteger(interviews) || interviews < 0) {
      throw new BadRequestException(
        'Interviews scheduled must be a whole number of 0 or more',
      );
    }
    return {
      category,
      clientId: null,
      team,
      supportFunction: resolveSupportFunction(team, input.supportFunction),
      salesOwnerUserId: null,
      benchStartDate,
      interviewsScheduledCount: interviews,
    };
  }

  throw new BadRequestException('category is required');
}

export function assertActiveBillable(
  candidate: { status: CandidateStatus; category: EmployeeCategory },
  action: 'timesheet' | 'invoice' | 'delivery-review',
): void {
  if (
    candidate.status === CandidateStatus.ACTIVE &&
    candidate.category === EmployeeCategory.BILLABLE
  ) {
    return;
  }
  const message =
    action === 'timesheet'
      ? 'Timesheets can only be filled for active billable employees'
      : action === 'invoice'
        ? 'Invoices can only be generated for active billable employees'
        : 'Delivery reviews can only be created for active billable employees';
  throw new BadRequestException(message);
}

export function computeBenchAging(
  benchStartDate: Date | null | undefined,
  today: Date = utcToday(),
): { days: number; months: number } | null {
  if (!benchStartDate) return null;
  const start = parseDateOnly(benchStartDate);
  const end = parseDateOnly(today);
  const days = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  return { days, months };
}
