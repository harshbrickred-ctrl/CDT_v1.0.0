import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  CandidateStatus,
  ClientFeedback,
  EngagementHealth,
  InvoiceStatus,
  LeaveStatus,
  Prisma,
} from '@prisma/client';
import { periodFromYearMonth, previousYearMonth, utcToday, missingDueTimesheetMonths } from '../common/dates';
import { toNumber } from '../common/prisma-error';
import {
  emptyIfNoAccess,
  resolveOwnedClientIds,
  withClientIdScope,
} from '../common/client-scope';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { fetchKpiDetail } from './kpi-detail';
import { fetchDashboardCharts } from './dashboard-charts';

const INVOICED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.APPROVED,
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveMonth(month?: string): string {
    if (month) {
      try {
        periodFromYearMonth(month);
        return month;
      } catch {
        throw new BadRequestException('Invalid month; expected YYYY-MM');
      }
    }
    const now = new Date();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${now.getUTCFullYear()}-${mm}`;
  }

  private invoiceWhere(
    candidateBase: Prisma.CandidateWhereInput,
    month?: string,
  ): Prisma.InvoiceWhereInput {
    return {
      ...(month ? { yearMonth: month } : {}),
      candidate: candidateBase,
    };
  }

  async summary(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    clientId?: string;
    health?: EngagementHealth;
    month?: string;
  }) {
    const month = this.resolveMonth(params.month);
    const { periodStart, periodEnd } = periodFromYearMonth(month);
    const today = utcToday();
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, params.user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return this.emptySummary(month);
    }
    const clientFilter = withClientIdScope(ownedClientIds, params.clientId);

    const candidateBase: Prisma.CandidateWhereInput = {
      organizationId: params.user.organizationId,
      deletedAt: null,
      ...(clientFilter ? { clientId: clientFilter } : {}),
    };

    const activeWhere: Prisma.CandidateWhereInput = {
      ...candidateBase,
      status: CandidateStatus.ACTIVE,
    };

    const invoiceBase = this.invoiceWhere(candidateBase, month);
    const organizationId = params.user.organizationId;

    const [
      activeCandidates,
      totalCandidates,
      totalReleasedCandidates,
      onLeaveToday,
      pendingLeaveApprovals,
      pendingTimesheetApprovals,
      reviewsInMonth,
      timesheetsInMonth,
      clients,
      draftInvoices,
      rejectedInvoices,
      overdueInvoices,
      totalInvoicedAgg,
      paidAgg,
      outstandingAgg,
      paidInvoicesForTat,
    ] = await Promise.all([
      this.prisma.candidate.count({ where: activeWhere }),
      this.prisma.candidate.count({ where: candidateBase }),
      this.prisma.candidate.count({
        where: { ...candidateBase, status: CandidateStatus.RELEASED },
      }),
      this.prisma.leave.count({
        where: {
          organizationId,
          deletedAt: null,
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
          candidate: activeWhere,
        },
      }),
      this.prisma.leave.count({
        where: {
          organizationId,
          deletedAt: null,
          status: LeaveStatus.PENDING,
          candidate: candidateBase,
        },
      }),
      this.prisma.timesheet.count({
        where: {
          organizationId,
          deletedAt: null,
          approvalStatus: ApprovalStatus.PENDING,
          yearMonth: month,
          candidate: candidateBase,
        },
      }),
      this.prisma.deliveryReview.findMany({
        where: {
          organizationId,
          deletedAt: null,
          yearMonth: month,
          ...(params.health ? { engagementHealth: params.health } : {}),
          candidate: candidateBase,
        },
        select: {
          engagementHealth: true,
          clientFeedback: true,
          utilizationPct: true,
          candidateId: true,
        },
      }),
      this.prisma.timesheet.findMany({
        where: {
          organizationId,
          deletedAt: null,
          yearMonth: month,
          candidate: candidateBase,
        },
        select: {
          attendancePct: true,
          candidateId: true,
          approvalStatus: true,
          candidate: { select: { clientId: true } },
        },
      }),
      this.prisma.client.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(clientFilter ? { id: clientFilter } : {}),
        },
        select: {
          id: true,
          name: true,
          candidates: {
            where: {
              organizationId,
              deletedAt: null,
              status: CandidateStatus.ACTIVE,
            },
            select: { id: true },
          },
        },
      }),
      this.prisma.invoice.count({
        where: { ...invoiceBase, status: InvoiceStatus.PENDING_REVIEW },
      }),
      this.prisma.invoice.count({
        where: { ...invoiceBase, status: InvoiceStatus.REJECTED },
      }),
      this.prisma.invoice.count({
        where: {
          organizationId,
          candidate: candidateBase,
          status: InvoiceStatus.SENT,
          dueDate: { lt: today },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { ...invoiceBase, status: { in: INVOICED_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...invoiceBase, status: InvoiceStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...invoiceBase, status: InvoiceStatus.SENT },
        _sum: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          ...invoiceBase,
          status: InvoiceStatus.PAID,
          sentAt: { not: null },
          paidAt: { not: null },
        },
        select: { sentAt: true, paidAt: true },
      }),
    ]);

    const healthBreakdown = {
      onTrack: reviewsInMonth.filter(
        (r) => r.engagementHealth === EngagementHealth.ON_TRACK,
      ).length,
      atRisk: reviewsInMonth.filter(
        (r) => r.engagementHealth === EngagementHealth.AT_RISK,
      ).length,
      escalated: reviewsInMonth.filter(
        (r) => r.engagementHealth === EngagementHealth.ESCALATED,
      ).length,
    };

    const goodClientFeedback = reviewsInMonth.filter(
      (r) => r.clientFeedback === ClientFeedback.GOOD,
    ).length;

    const utilValues = timesheetsInMonth
      .map((t) => toNumber(t.attendancePct))
      .filter((n): n is number => n !== null && !Number.isNaN(n));
    const avgUtilizationPct =
      utilValues.length > 0
        ? Math.round(
            (utilValues.reduce((a, b) => a + b, 0) / utilValues.length) * 10,
          ) / 10
        : null;

    const tatDays = paidInvoicesForTat
      .map((inv) => {
        if (!inv.sentAt || !inv.paidAt) return null;
        const ms = inv.paidAt.getTime() - inv.sentAt.getTime();
        return ms / (1000 * 60 * 60 * 24);
      })
      .filter((d): d is number => d !== null && d >= 0);
    const avgPaymentTatDays =
      tatDays.length > 0
        ? Math.round((tatDays.reduce((a, b) => a + b, 0) / tatDays.length) * 10) /
          10
        : null;

    const utilByClient = new Map<string, number[]>();
    for (const t of timesheetsInMonth) {
      const cid = t.candidate.clientId;
      const pct = toNumber(t.attendancePct);
      if (pct === null) continue;
      const arr = utilByClient.get(cid) ?? [];
      arr.push(pct);
      utilByClient.set(cid, arr);
    }

    const topClients = clients
      .map((c) => {
        const utils = utilByClient.get(c.id) ?? [];
        const avgUtilization =
          utils.length > 0
            ? Math.round(
                (utils.reduce((a, b) => a + b, 0) / utils.length) * 10,
              ) / 10
            : null;
        return {
          clientId: c.id,
          name: c.name,
          activeHeadcount: c.candidates.length,
          avgUtilization,
        };
      })
      .filter((c) => c.activeHeadcount > 0 || (c.avgUtilization ?? 0) > 0)
      .sort((a, b) => b.activeHeadcount - a.activeHeadcount)
      .slice(0, 3);

    const healthChart = [
      { key: 'ON_TRACK', label: 'On Track', count: healthBreakdown.onTrack },
      { key: 'AT_RISK', label: 'At Risk', count: healthBreakdown.atRisk },
      {
        key: 'ESCALATED',
        label: 'Escalated',
        count: healthBreakdown.escalated,
      },
    ];

    const timesheetsByCandidate = new Map<string, Set<string>>();
    for (const t of await this.prisma.timesheet.findMany({
      where: {
        organizationId,
        deletedAt: null,
        candidate: {
          ...candidateBase,
          status: { in: [CandidateStatus.ACTIVE, CandidateStatus.RELEASED] },
        },
      },
      select: { candidateId: true, yearMonth: true },
    })) {
      let set = timesheetsByCandidate.get(t.candidateId);
      if (!set) {
        set = new Set();
        timesheetsByCandidate.set(t.candidateId, set);
      }
      set.add(t.yearMonth);
    }

    const timesheetEligible = await this.prisma.candidate.findMany({
      where: {
        ...candidateBase,
        status: { in: [CandidateStatus.ACTIVE, CandidateStatus.RELEASED] },
      },
      select: {
        id: true,
        status: true,
        joinedOn: true,
        contractEndDate: true,
        releasedAt: true,
      },
    });
    // Count people with any overdue (due-but-missing) timesheet month.
    // ACTIVE: due through previous month only. RELEASED: include release month.
    const missingTimesheetsCount = timesheetEligible.filter(
      (c) =>
        missingDueTimesheetMonths(
          c,
          timesheetsByCandidate.get(c.id) ?? new Set(),
          today,
        ).length > 0,
    ).length;
    const approvedTimesheetsCount = timesheetsInMonth.filter(
      (t) => t.approvalStatus === ApprovalStatus.APPROVED,
    ).length;
    const charts = await fetchDashboardCharts(this.prisma, {
      organizationId,
      month,
      clientId: params.clientId,
      ownedClientIds,
      health: params.health,
    });

    return {
      month,
      activeCandidates,
      totalCandidates,
      onTrackEngagements: healthBreakdown.onTrack,
      atRiskEngagements: healthBreakdown.atRisk,
      escalations: healthBreakdown.escalated,
      totalReleasedCandidates,
      totalInvoiced: toNumber(totalInvoicedAgg._sum.amount) ?? 0,
      paidAmount: toNumber(paidAgg._sum.amount) ?? 0,
      outstandingAmount: toNumber(outstandingAgg._sum.amount) ?? 0,
      rejectedInvoices,
      draftInvoices,
      overdueInvoices,
      onLeaveToday,
      pendingLeaveApprovals,
      pendingTimesheetApprovals,
      approvedTimesheetsCount,
      avgUtilizationPct,
      avgPaymentTatDays,
      goodClientFeedback,
      releasedInMonth: await this.prisma.candidate.count({
        where: {
          ...candidateBase,
          status: CandidateStatus.RELEASED,
          releasedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      healthBreakdown,
      missingTimesheetsCount,
      healthChart,
      topClients,
      charts,
    };
  }

  private emptySummary(month: string) {
    return {
      month,
      activeCandidates: 0,
      totalCandidates: 0,
      onTrackEngagements: 0,
      atRiskEngagements: 0,
      escalations: 0,
      totalReleasedCandidates: 0,
      totalInvoiced: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      rejectedInvoices: 0,
      draftInvoices: 0,
      overdueInvoices: 0,
      onLeaveToday: 0,
      pendingLeaveApprovals: 0,
      pendingTimesheetApprovals: 0,
      approvedTimesheetsCount: 0,
      avgUtilizationPct: null,
      avgPaymentTatDays: null,
      goodClientFeedback: 0,
      releasedInMonth: 0,
      healthBreakdown: { onTrack: 0, atRisk: 0, escalated: 0 },
      missingTimesheetsCount: 0,
      healthChart: [
        { key: 'ON_TRACK', label: 'On Track', count: 0 },
        { key: 'AT_RISK', label: 'At Risk', count: 0 },
        { key: 'ESCALATED', label: 'Escalated', count: 0 },
      ],
      topClients: [],
      charts: {
        headcountByClient: [],
        paymentStatusByAmount: [],
        invoiceStatusBars: [],
        revenueTrendByMonth: [],
        topClientsByRevenue: [],
        atRiskClients: [],
      },
    };
  }

  async overdueReviews(
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>,
    month?: string,
  ) {
    const yearMonth = month
      ? this.resolveMonth(month)
      : previousYearMonth(this.resolveMonth());
    const prev = previousYearMonth(yearMonth);
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, user);
    if (emptyIfNoAccess(ownedClientIds)) {
      return { month: yearMonth, previousMonth: prev, count: 0, items: [] };
    }
    const clientFilter = withClientIdScope(ownedClientIds);

    const activeCandidates = await this.prisma.candidate.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        status: CandidateStatus.ACTIVE,
        ...(clientFilter ? { clientId: clientFilter } : {}),
      },
      select: {
        id: true,
        publicId: true,
        fullName: true,
        clientId: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const reviews = await this.prisma.deliveryReview.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        yearMonth: { in: [yearMonth, prev] },
        candidateId: { in: activeCandidates.map((c) => c.id) },
      },
      select: { candidateId: true, yearMonth: true },
    });

    const reviewed = new Set(
      reviews
        .filter((r) => r.yearMonth === yearMonth || r.yearMonth === prev)
        .map((r) => `${r.candidateId}:${r.yearMonth}`),
    );

    const items = activeCandidates.filter((c) => {
      const hasMonth = reviewed.has(`${c.id}:${yearMonth}`);
      const hasPrev = reviewed.has(`${c.id}:${prev}`);
      return !hasMonth && !hasPrev;
    });

    return {
      month: yearMonth,
      previousMonth: prev,
      count: items.length,
      items,
    };
  }

  async kpiDetail(params: {
    user: Pick<AuthUser, 'id' | 'role' | 'organizationId'>;
    kpi: string;
    clientId?: string;
    health?: EngagementHealth;
    month?: string;
    detailMonth?: string;
  }) {
    const month = this.resolveMonth(params.month);
    const ownedClientIds = await resolveOwnedClientIds(this.prisma, params.user);
    try {
      return await fetchKpiDetail(this.prisma, {
        organizationId: params.user.organizationId,
        kpi: params.kpi,
        clientId: params.clientId,
        health: params.health,
        month,
        detailMonth: params.detailMonth,
        ownedClientIds,
      });
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.startsWith('Unknown KPI') ||
          e.message.startsWith('Invalid detailMonth'))
      ) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
