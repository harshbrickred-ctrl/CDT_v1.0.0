import {
  ApprovalStatus,
  CandidateStatus,
  ClientFeedback,
  EngagementHealth,
  InvoiceStatus,
  LeaveStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { toNumber } from '../common/prisma-error';
import {
  missingDueTimesheetMonths,
  periodFromYearMonth,
  utcToday,
} from '../common/dates';

const INVOICED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.APPROVED,
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
];

export const DASHBOARD_KPI_IDS = [
  'total',
  'active',
  'on-track',
  'at-risk',
  'escalations',
  'released-total',
  'total-invoiced',
  'paid',
  'outstanding',
  'rejected-inv',
  'draft-inv',
  'overdue-inv',
  'pending-leave',
  'pending-ts',
  'missing-ts',
  'approved-ts',
  'on-leave',
  'avg-util',
  'avg-tat',
  'feedback',
] as const;

export type DashboardKpiId = (typeof DASHBOARD_KPI_IDS)[number];

export type KpiDetailColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type KpiDetailRow = {
  id: string;
  entityType?: 'candidate' | 'invoice' | 'leave' | 'timesheet' | 'review';
  entityId?: string;
  [key: string]: string | number | null | undefined;
};

export type KpiDetailResult = {
  kpi: DashboardKpiId;
  title: string;
  columns: KpiDetailColumn[];
  rows: KpiDetailRow[];
  /** Present for Missing Timesheets: months list vs candidates for one month. */
  view?: 'months' | 'candidates';
  detailMonth?: string | null;
  /** When view=months, candidates missing each YYYY-MM (for client drill-down). */
  candidatesByMonth?: Record<string, KpiDetailRow[]>;
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function fmtAmount(amount: Prisma.Decimal | number, currency: string) {
  const n = toNumber(amount) ?? 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: Prisma.Decimal | number | null | undefined) {
  const v = toNumber(n);
  if (v == null || Number.isNaN(v)) return null;
  return `${v}%`;
}

function fmtStatus(status: string) {
  return status.replace(/_/g, ' ');
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatYearMonthLabel(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return yearMonth;
  return `${MONTH_LABELS[monthIndex]} ${match[1]}`;
}

function candidateBaseWhere(
  organizationId: string,
  clientId?: string,
): Prisma.CandidateWhereInput {
  return {
    organizationId,
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
  };
}

export async function fetchKpiDetail(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    kpi: string;
    clientId?: string;
    health?: EngagementHealth;
    month?: string;
    /** For missing-ts: YYYY-MM of the month to list candidates for. */
    detailMonth?: string;
  },
): Promise<KpiDetailResult> {
  const kpi = params.kpi as DashboardKpiId;
  if (!DASHBOARD_KPI_IDS.includes(kpi)) {
    throw new Error(`Unknown KPI: ${params.kpi}`);
  }

  const month = params.month ?? defaultMonth();
  periodFromYearMonth(month);
  const today = utcToday();
  const candidateBase = candidateBaseWhere(
    params.organizationId,
    params.clientId,
  );

  switch (kpi) {
    case 'active':
      return candidateRows(
        kpi,
        'Active Candidates',
        await prisma.candidate.findMany({
          where: { ...candidateBase, status: CandidateStatus.ACTIVE },
          select: candidateSelect,
          orderBy: { fullName: 'asc' },
          take: 200,
        }),
      );

    case 'total':
      return candidateRows(
        kpi,
        'Total Candidates (All Statuses)',
        await prisma.candidate.findMany({
          where: candidateBase,
          select: candidateSelect,
          orderBy: { fullName: 'asc' },
          take: 200,
        }),
        true,
      );

    case 'released-total':
      return candidateRows(
        kpi,
        'Total Released Candidates',
        await prisma.candidate.findMany({
          where: { ...candidateBase, status: CandidateStatus.RELEASED },
          select: candidateSelect,
          orderBy: { releasedAt: 'desc' },
          take: 200,
        }),
        true,
        true,
      );

    case 'on-track':
    case 'at-risk':
    case 'escalations':
    case 'feedback': {
      const healthMap = {
        'on-track': EngagementHealth.ON_TRACK,
        'at-risk': EngagementHealth.AT_RISK,
        escalations: EngagementHealth.ESCALATED,
        feedback: null,
      } as const;
      const titleMap = {
        'on-track': 'On Track Engagements',
        'at-risk': 'At Risk Engagements',
        escalations: 'Escalations',
        feedback: 'Good Client Feedback',
      } as const;
      const engagementHealth = healthMap[kpi];
      if (
        params.health &&
        engagementHealth &&
        params.health !== engagementHealth
      ) {
        return emptyReviewDetail(kpi, titleMap[kpi]);
      }
      const reviews = await prisma.deliveryReview.findMany({
        where: {
          deletedAt: null,
          yearMonth: month,
          ...(engagementHealth ? { engagementHealth } : {}),
          ...(kpi === 'feedback' ? { clientFeedback: ClientFeedback.GOOD } : {}),
          candidate: candidateBase,
        },
        include: {
          candidate: {
            select: {
              id: true,
              publicId: true,
              fullName: true,
              roleTitle: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { reviewDate: 'desc' },
        take: 200,
      });
      return {
        kpi,
        title: titleMap[kpi],
        columns: [
          { key: 'publicId', label: 'Review' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'health', label: 'Health' },
          { key: 'feedback', label: 'Feedback' },
          { key: 'utilization', label: 'Utilization', align: 'right' },
        ],
        rows: reviews.map((r) => ({
          id: r.id,
          entityType: 'review' as const,
          entityId: r.candidateId,
          publicId: r.publicId,
          candidate: r.candidate.fullName,
          client: r.candidate.client?.name ?? null,
          health: fmtStatus(r.engagementHealth),
          feedback: r.clientFeedback ? fmtStatus(r.clientFeedback) : null,
          utilization: fmtPct(r.utilizationPct),
        })),
      };
    }

    case 'total-invoiced':
    case 'paid':
    case 'outstanding':
    case 'rejected-inv':
    case 'draft-inv':
    case 'overdue-inv':
    case 'avg-tat': {
      const titleMap = {
        'total-invoiced': 'Total Invoiced',
        paid: 'Paid Invoices',
        outstanding: 'Outstanding (Sent)',
        'rejected-inv': 'Rejected Invoices',
        'draft-inv': 'Draft Invoices',
        'overdue-inv': 'Overdue Invoices',
        'avg-tat': 'Payment TAT Details',
      } as const;
      const statusWhere = invoiceStatusWhere(kpi, today);
      const invoices = await prisma.invoice.findMany({
        where: {
          ...(kpi === 'overdue-inv' ? {} : { yearMonth: month }),
          organizationId: params.organizationId,
          candidate: candidateBase,
          ...statusWhere,
        },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      const columns: KpiDetailColumn[] =
        kpi === 'avg-tat'
          ? [
              { key: 'publicId', label: 'Invoice' },
              { key: 'candidate', label: 'Candidate' },
              { key: 'client', label: 'Client' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'sentAt', label: 'Sent' },
              { key: 'paidAt', label: 'Paid' },
              { key: 'tatDays', label: 'TAT (days)', align: 'right' },
            ]
          : [
              { key: 'publicId', label: 'Invoice' },
              { key: 'candidate', label: 'Candidate' },
              { key: 'client', label: 'Client' },
              { key: 'amount', label: 'Amount', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'dueDate', label: 'Due' },
            ];
      return {
        kpi,
        title: titleMap[kpi],
        columns,
        rows: invoices.map((inv) => {
          const tatDays =
            inv.sentAt && inv.paidAt
              ? Math.round(
                  (inv.paidAt.getTime() - inv.sentAt.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null;
          return {
            id: inv.id,
            entityType: 'invoice' as const,
            entityId: inv.id,
            publicId: inv.publicId,
            candidate: inv.candidate.fullName,
            client: inv.candidate.client?.name ?? null,
            amount: fmtAmount(inv.amount, inv.currency),
            status: fmtStatus(inv.status),
            dueDate: fmtDate(inv.dueDate),
            sentAt: fmtDate(inv.sentAt),
            paidAt: fmtDate(inv.paidAt),
            tatDays,
          };
        }),
      };
    }

    case 'pending-leave': {
      const leaves = await prisma.leave.findMany({
        where: {
          deletedAt: null,
          status: LeaveStatus.PENDING,
          candidate: candidateBase,
        },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { startDate: 'asc' },
        take: 200,
      });
      return {
        kpi,
        title: 'Pending Leave Approvals',
        columns: [
          { key: 'publicId', label: 'Leave' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'type', label: 'Type' },
          { key: 'dates', label: 'Dates' },
          { key: 'days', label: 'Days', align: 'right' },
        ],
        rows: leaves.map((lv) => ({
          id: lv.id,
          entityType: 'leave' as const,
          entityId: lv.id,
          publicId: lv.publicId,
          candidate: lv.candidate.fullName,
          client: lv.candidate.client?.name ?? null,
          type: fmtStatus(lv.leaveTypeCode),
          dates: `${fmtDate(lv.startDate)} – ${fmtDate(lv.endDate)}`,
          days: toNumber(lv.days),
        })),
      };
    }

    case 'on-leave': {
      const leaves = await prisma.leave.findMany({
        where: {
          deletedAt: null,
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
          candidate: { ...candidateBase, status: CandidateStatus.ACTIVE },
        },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              roleTitle: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { startDate: 'asc' },
        take: 200,
      });
      return {
        kpi,
        title: 'On Leave Today',
        columns: [
          { key: 'publicId', label: 'Leave' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'role', label: 'Role' },
          { key: 'dates', label: 'Dates' },
          { key: 'days', label: 'Days', align: 'right' },
        ],
        rows: leaves.map((lv) => ({
          id: lv.id,
          entityType: 'leave' as const,
          entityId: lv.id,
          publicId: lv.publicId,
          candidate: lv.candidate.fullName,
          client: lv.candidate.client?.name ?? null,
          role: lv.candidate.roleTitle,
          dates: `${fmtDate(lv.startDate)} – ${fmtDate(lv.endDate)}`,
          days: toNumber(lv.days),
        })),
      };
    }

    case 'pending-ts':
    case 'approved-ts':
    case 'avg-util': {
      const timesheets = await prisma.timesheet.findMany({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          yearMonth: month,
          ...(kpi === 'pending-ts'
            ? { approvalStatus: ApprovalStatus.PENDING }
            : kpi === 'approved-ts'
              ? { approvalStatus: ApprovalStatus.APPROVED }
              : {}),
          candidate: candidateBase,
        },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { publicId: 'asc' },
        take: 200,
      });
      return {
        kpi,
        title:
          kpi === 'pending-ts'
            ? 'Pending Timesheet Approvals'
            : kpi === 'approved-ts'
              ? 'Approved Timesheets'
              : 'Utilization by Timesheet',
        columns: [
          { key: 'publicId', label: 'Timesheet' },
          { key: 'candidate', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'daysWorked', label: 'Days worked', align: 'right' },
          { key: 'utilization', label: 'Utilization', align: 'right' },
          { key: 'status', label: 'Status' },
        ],
        rows: timesheets.map((ts) => ({
          id: ts.id,
          entityType: 'timesheet' as const,
          entityId: ts.id,
          publicId: ts.publicId,
          candidate: ts.candidate.fullName,
          client: ts.candidate.client?.name ?? null,
          daysWorked: toNumber(ts.daysWorked),
          utilization: fmtPct(ts.attendancePct),
          status: fmtStatus(ts.approvalStatus),
        })),
      };
    }

    case 'missing-ts': {
      const asOf = utcToday();
      let detailMonth: string | undefined;
      if (params.detailMonth) {
        try {
          periodFromYearMonth(params.detailMonth);
          detailMonth = params.detailMonth;
        } catch {
          throw new Error('Invalid detailMonth; expected YYYY-MM');
        }
      }
      const [eligibleCandidates, timesheets] = await Promise.all([
        prisma.candidate.findMany({
          where: {
            ...candidateBase,
            status: {
              in: [CandidateStatus.ACTIVE, CandidateStatus.RELEASED],
            },
          },
          select: {
            ...candidateSelect,
            joinedOn: true,
            contractEndDate: true,
          },
          orderBy: { fullName: 'asc' },
          take: 2000,
        }),
        prisma.timesheet.findMany({
          where: {
            organizationId: params.organizationId,
            deletedAt: null,
            candidate: {
              ...candidateBase,
              status: {
                in: [CandidateStatus.ACTIVE, CandidateStatus.RELEASED],
              },
            },
          },
          select: { candidateId: true, yearMonth: true },
        }),
      ]);
      const timesheetsByCandidate = new Map<string, Set<string>>();
      for (const t of timesheets) {
        let set = timesheetsByCandidate.get(t.candidateId);
        if (!set) {
          set = new Set();
          timesheetsByCandidate.set(t.candidateId, set);
        }
        set.add(t.yearMonth);
      }
      const missing = eligibleCandidates
        .map((c) => {
          const months = missingDueTimesheetMonths(
            c,
            timesheetsByCandidate.get(c.id) ?? new Set(),
            asOf,
          );
          return { candidate: c, months };
        })
        .filter((row) => row.months.length > 0);

      if (!detailMonth) {
        const countByMonth = new Map<string, number>();
        const candidatesByMonth: Record<string, KpiDetailRow[]> = {};
        for (const row of missing) {
          const candidateRow: KpiDetailRow = {
            id: row.candidate.id,
            entityType: 'candidate',
            entityId: row.candidate.id,
            publicId: row.candidate.publicId,
            name: row.candidate.fullName,
            client: row.candidate.client?.name ?? null,
            role: row.candidate.roleTitle,
            status: fmtStatus(row.candidate.status),
            releasedAt:
              fmtDate(row.candidate.contractEndDate) ??
              fmtDate(row.candidate.releasedAt) ??
              null,
          };
          for (const m of row.months) {
            countByMonth.set(m, (countByMonth.get(m) ?? 0) + 1);
            if (!candidatesByMonth[m]) candidatesByMonth[m] = [];
            if (candidatesByMonth[m].length < 200) {
              candidatesByMonth[m].push(candidateRow);
            }
          }
        }
        const monthRows = [...countByMonth.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([yearMonth, candidateCount]) => ({
            id: yearMonth,
            yearMonth,
            month: formatYearMonthLabel(yearMonth),
            candidateCount,
          }));
        return {
          kpi,
          title: 'Missing Timesheets',
          view: 'months',
          detailMonth: null,
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'candidateCount', label: 'Candidates', align: 'right' },
          ],
          rows: monthRows,
          candidatesByMonth,
        };
      }

      const forMonth = missing.filter((row) =>
        row.months.includes(detailMonth),
      );
      return {
        kpi,
        title: `Missing Timesheets — ${formatYearMonthLabel(detailMonth)}`,
        view: 'candidates',
        detailMonth,
        columns: [
          { key: 'publicId', label: 'ID' },
          { key: 'name', label: 'Candidate' },
          { key: 'client', label: 'Client' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'releasedAt', label: 'Released / end' },
        ],
        rows: forMonth.slice(0, 200).map(({ candidate: c }) => ({
          id: c.id,
          entityType: 'candidate' as const,
          entityId: c.id,
          publicId: c.publicId,
          name: c.fullName,
          client: c.client?.name ?? null,
          role: c.roleTitle,
          status: fmtStatus(c.status),
          releasedAt:
            fmtDate(c.contractEndDate) ?? fmtDate(c.releasedAt) ?? null,
        })),
      };
    }

    default:
      throw new Error(`Unhandled KPI: ${kpi}`);
  }
}

const candidateSelect = {
  id: true,
  publicId: true,
  fullName: true,
  roleTitle: true,
  status: true,
  releasedAt: true,
  client: { select: { name: true } },
} as const;

function candidateRows(
  kpi: DashboardKpiId,
  title: string,
  candidates: Array<{
    id: string;
    publicId: string;
    fullName: string;
    roleTitle: string | null;
    status: CandidateStatus;
    releasedAt: Date | null;
    client: { name: string } | null;
  }>,
  includeStatus = false,
  includeReleased = false,
): KpiDetailResult {
  const columns: KpiDetailColumn[] = [
    { key: 'publicId', label: 'ID' },
    { key: 'name', label: 'Candidate' },
    { key: 'client', label: 'Client' },
    { key: 'role', label: 'Role' },
  ];
  if (includeStatus) columns.push({ key: 'status', label: 'Status' });
  if (includeReleased) columns.push({ key: 'releasedAt', label: 'Released' });

  return {
    kpi,
    title,
    columns,
    rows: candidates.map((c) => ({
      id: c.id,
      entityType: 'candidate' as const,
      entityId: c.id,
      publicId: c.publicId,
      name: c.fullName,
      client: c.client?.name ?? null,
      role: c.roleTitle,
      ...(includeStatus ? { status: fmtStatus(c.status) } : {}),
      ...(includeReleased ? { releasedAt: fmtDate(c.releasedAt) } : {}),
    })),
  };
}

function invoiceStatusWhere(
  kpi: DashboardKpiId,
  today: Date,
): Prisma.InvoiceWhereInput {
  switch (kpi) {
    case 'total-invoiced':
      return { status: { in: INVOICED_STATUSES } };
    case 'paid':
    case 'avg-tat':
      return {
        status: InvoiceStatus.PAID,
        ...(kpi === 'avg-tat'
          ? { sentAt: { not: null }, paidAt: { not: null } }
          : {}),
      };
    case 'outstanding':
      return { status: InvoiceStatus.SENT };
    case 'rejected-inv':
      return { status: InvoiceStatus.REJECTED };
    case 'draft-inv':
      return { status: InvoiceStatus.PENDING_REVIEW };
    case 'overdue-inv':
      return { status: InvoiceStatus.SENT, dueDate: { lt: today } };
    default:
      return {};
  }
}

function defaultMonth() {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${mm}`;
}

function emptyReviewDetail(
  kpi: DashboardKpiId,
  title: string,
): KpiDetailResult {
  return {
    kpi,
    title,
    columns: [
      { key: 'publicId', label: 'Review' },
      { key: 'candidate', label: 'Candidate' },
      { key: 'client', label: 'Client' },
      { key: 'health', label: 'Health' },
      { key: 'feedback', label: 'Feedback' },
      { key: 'utilization', label: 'Utilization', align: 'right' },
    ],
    rows: [],
  };
}
