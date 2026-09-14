import {
  CandidateStatus,
  EngagementHealth,
  InvoiceStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { previousYearMonth, utcToday } from '../common/dates';
import { toNumber } from '../common/prisma-error';
import { withClientIdScope } from '../common/client-scope';

const INVOICED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.APPROVED,
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
];

export type HeadcountByClientItem = {
  clientId: string;
  name: string;
  headcount: number;
};

export type PaymentStatusItem = {
  key: string;
  label: string;
  amount: number;
};

export type RevenueTrendItem = {
  month: string;
  label: string;
  revenue: number;
};

export type ClientRevenueItem = {
  clientId: string;
  name: string;
  revenue: number;
};

export type AtRiskClientItem = {
  clientId: string;
  name: string;
  atRiskCount: number;
  escalatedCount: number;
};

export type DashboardChartsData = {
  headcountByClient: HeadcountByClientItem[];
  paymentStatusByAmount: PaymentStatusItem[];
  invoiceStatusBars: PaymentStatusItem[];
  revenueTrendByMonth: RevenueTrendItem[];
  topClientsByRevenue: ClientRevenueItem[];
  atRiskClients: AtRiskClientItem[];
};

function candidateBaseWhere(
  organizationId: string,
  ownedClientIds: string[] | null | undefined,
  clientId?: string,
): Prisma.CandidateWhereInput {
  const clientFilter = withClientIdScope(ownedClientIds ?? null, clientId);
  return {
    organizationId,
    deletedAt: null,
    ...(clientFilter ? { clientId: clientFilter } : {}),
  };
}

function invoiceScopeWhere(
  candidateBase: Prisma.CandidateWhereInput,
  yearMonth?: string,
): Prisma.InvoiceWhereInput {
  return {
    ...(yearMonth ? { yearMonth } : {}),
    candidate: candidateBase,
  };
}

function trailingMonths(endMonth: string, count: number): string[] {
  const months: string[] = [];
  let current = endMonth;
  for (let i = 0; i < count; i++) {
    months.unshift(current);
    current = previousYearMonth(current);
  }
  return months;
}

function monthLabel(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export async function fetchDashboardCharts(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    month: string;
    clientId?: string;
    ownedClientIds?: string[] | null;
    health?: EngagementHealth;
  },
): Promise<DashboardChartsData> {
  const candidateBase = candidateBaseWhere(
    params.organizationId,
    params.ownedClientIds,
    params.clientId,
  );
  const activeWhere: Prisma.CandidateWhereInput = {
    ...candidateBase,
    status: CandidateStatus.ACTIVE,
  };
  const clientFilter = withClientIdScope(
    params.ownedClientIds ?? null,
    params.clientId,
  );

  const atRiskReviewWhere: Prisma.DeliveryReviewWhereInput =
    params.health === EngagementHealth.ON_TRACK
      ? { id: { in: [] } }
      : {
          organizationId: params.organizationId,
          deletedAt: null,
          yearMonth: params.month,
          engagementHealth: params.health ?? {
            in: [EngagementHealth.AT_RISK, EngagementHealth.ESCALATED],
          },
          candidate: candidateBase,
        };

  const [
    clients,
    invoicesInMonth,
    reviewsInMonth,
    revenueByMonthRaw,
    revenueByClientRaw,
  ] = await Promise.all([
    prisma.client.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        ...(clientFilter ? { id: clientFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        candidates: {
          where: {
            organizationId: params.organizationId,
            deletedAt: null,
            status: CandidateStatus.ACTIVE,
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.invoice.findMany({
      where: invoiceScopeWhere(candidateBase, params.month),
      select: { status: true, amount: true, dueDate: true },
    }),
    prisma.deliveryReview.findMany({
      where: atRiskReviewWhere,
      select: {
        engagementHealth: true,
        candidate: {
          select: {
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.invoice.groupBy({
      by: ['yearMonth'],
      where: {
        candidate: candidateBase,
        yearMonth: { in: trailingMonths(params.month, 6) },
        status: { in: INVOICED_STATUSES },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ['candidateId'],
      where: {
        ...invoiceScopeWhere(candidateBase, params.month),
        status: { in: INVOICED_STATUSES },
      },
      _sum: { amount: true },
    }),
  ]);

  const headcountByClient = clients
    .map((c) => ({
      clientId: c.id,
      name: c.name,
      headcount: c.candidates.length,
    }))
    .filter((c) => c.headcount > 0)
    .sort((a, b) => b.headcount - a.headcount);

  const paymentBuckets: Record<string, { label: string; amount: number }> = {
    PAID: { label: 'Paid', amount: 0 },
    SENT: { label: 'Outstanding', amount: 0 },
    APPROVED: { label: 'Approved', amount: 0 },
    PENDING_REVIEW: { label: 'Draft', amount: 0 },
    REJECTED: { label: 'Rejected', amount: 0 },
  };
  for (const inv of invoicesInMonth) {
    const bucket = paymentBuckets[inv.status];
    if (bucket) {
      bucket.amount += toNumber(inv.amount) ?? 0;
    }
  }
  const paymentStatusByAmount = Object.entries(paymentBuckets)
    .map(([key, v]) => ({ key, label: v.label, amount: Math.round(v.amount) }))
    .filter((p) => p.amount > 0);

  const today = utcToday();
  let invoicedAmt = 0;
  let paidAmt = 0;
  let outstandingAmt = 0;
  let overdueAmt = 0;
  let draftAmt = 0;
  let rejectedAmt = 0;
  let approvedAmt = 0;
  for (const inv of invoicesInMonth) {
    const amount = toNumber(inv.amount) ?? 0;
    if (INVOICED_STATUSES.includes(inv.status)) invoicedAmt += amount;
    if (inv.status === InvoiceStatus.PAID) paidAmt += amount;
    if (inv.status === InvoiceStatus.SENT) {
      outstandingAmt += amount;
      if (inv.dueDate && inv.dueDate < today) overdueAmt += amount;
    }
    if (inv.status === InvoiceStatus.PENDING_REVIEW) draftAmt += amount;
    if (inv.status === InvoiceStatus.APPROVED) approvedAmt += amount;
    if (inv.status === InvoiceStatus.REJECTED) rejectedAmt += amount;
  }
  const invoiceStatusBars = [
    { key: 'draft', label: 'Draft', amount: Math.round(draftAmt) },
    { key: 'approved', label: 'Approved', amount: Math.round(approvedAmt) },
    { key: 'outstanding', label: 'Outstanding', amount: Math.round(outstandingAmt) },
    { key: 'paid', label: 'Paid', amount: Math.round(paidAmt) },
    { key: 'overdue', label: 'Overdue', amount: Math.round(overdueAmt) },
    { key: 'rejected', label: 'Rejected', amount: Math.round(rejectedAmt) },
    { key: 'invoiced', label: 'Total invoiced', amount: Math.round(invoicedAmt) },
  ];

  const revenueMap = new Map(
    revenueByMonthRaw.map((r) => [
      r.yearMonth,
      toNumber(r._sum.amount) ?? 0,
    ]),
  );
  const revenueTrendByMonth = trailingMonths(params.month, 6).map((m) => ({
    month: m,
    label: monthLabel(m),
    revenue: Math.round(revenueMap.get(m) ?? 0),
  }));

  const candidateIds = revenueByClientRaw.map((r) => r.candidateId);
  const candidates =
    candidateIds.length > 0
      ? await prisma.candidate.findMany({
          where: {
            organizationId: params.organizationId,
            id: { in: candidateIds },
          },
          select: {
            id: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        })
      : [];
  const candidateClient = new Map(candidates.map((c) => [c.id, c]));

  const revenueByClientMap = new Map<string, { name: string; revenue: number }>();
  for (const row of revenueByClientRaw) {
    const candidate = candidateClient.get(row.candidateId);
    if (!candidate?.client) continue;
    const amount = toNumber(row._sum.amount) ?? 0;
    const existing = revenueByClientMap.get(candidate.clientId);
    if (existing) {
      existing.revenue += amount;
    } else {
      revenueByClientMap.set(candidate.clientId, {
        name: candidate.client.name,
        revenue: amount,
      });
    }
  }
  const topClientsByRevenue = [...revenueByClientMap.entries()]
    .map(([clientId, v]) => ({
      clientId,
      name: v.name,
      revenue: Math.round(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const atRiskMap = new Map<
    string,
    { name: string; atRiskCount: number; escalatedCount: number }
  >();
  for (const review of reviewsInMonth) {
    const client = review.candidate.client;
    if (!client) continue;
    const entry = atRiskMap.get(client.id) ?? {
      name: client.name,
      atRiskCount: 0,
      escalatedCount: 0,
    };
    if (review.engagementHealth === EngagementHealth.AT_RISK) {
      entry.atRiskCount += 1;
    } else if (review.engagementHealth === EngagementHealth.ESCALATED) {
      entry.escalatedCount += 1;
    }
    atRiskMap.set(client.id, entry);
  }
  const atRiskClients = [...atRiskMap.entries()]
    .map(([clientId, v]) => ({
      clientId,
      name: v.name,
      atRiskCount: v.atRiskCount,
      escalatedCount: v.escalatedCount,
    }))
    .sort(
      (a, b) =>
        b.atRiskCount + b.escalatedCount - (a.atRiskCount + a.escalatedCount),
    );

  return {
    headcountByClient,
    paymentStatusByAmount,
    invoiceStatusBars,
    revenueTrendByMonth,
    topClientsByRevenue,
    atRiskClients,
  };
}
