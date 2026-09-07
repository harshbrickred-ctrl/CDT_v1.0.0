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
import { periodFromYearMonth, previousYearMonth, utcToday } from '../common/dates';
import { toNumber } from '../common/prisma-error';
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
    organizationId: string;
    clientId?: string;
    health?: EngagementHealth;
    month?: string;
  }) {
    const month = this.resolveMonth(params.month);
    const { periodStart, periodEnd } = periodFromYearMonth(month);
    const today = utcToday();

    const candidateBase: Prisma.CandidateWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.clientId ? { clientId: params.clientId } : {}),
    };

    const activeWhere: Prisma.CandidateWhereInput = {
      ...candidateBase,
      status: CandidateStatus.ACTIVE,
    };

    const invoiceBase = this.invoiceWhere(candidateBase, month);

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
          organizationId: params.organizationId,
          deletedAt: null,
          status: LeaveStatus.APPROVED,
          startDate: { lte: today },
          endDate: { gte: today },
          candidate: activeWhere,
        },
      }),
      this.prisma.leave.count({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          status: LeaveStatus.PENDING,
          candidate: candidateBase,
        },
      }),
      this.prisma.timesheet.count({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          approvalStatus: ApprovalStatus.PENDING,
          yearMonth: month,
          candidate: candidateBase,
        },
      }),
      this.prisma.deliveryReview.findMany({
        where: {
          organizationId: params.organizationId,
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
          organizationId: params.organizationId,
          deletedAt: null,
          yearMonth: month,
          candidate: candidateBase,
        },
        select: {
          attendancePct: true,
          candidateId: true,
          candidate: { select: { clientId: true } },
        },
      }),
      this.prisma.client.findMany({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          ...(params.clientId ? { id: params.clientId } : {}),
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
      }),
      this.prisma.invoice.count({
        where: { ...invoiceBase, status: InvoiceStatus.PENDING_REVIEW },
      }),
      this.prisma.invoice.count({
        where: { ...invoiceBase, status: InvoiceStatus.REJECTED },
      }),
      this.prisma.invoice.count({
        where: {
          organizationId: params.organizationId,
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

    const activeCandidateIds = clients.flatMap((c) =>
      c.candidates.map((candidate) => candidate.id),
    );
    const timesheetCandidateIds = new Set(
      timesheetsInMonth.map((t) => t.candidateId),
    );
    const missingTimesheetsCount = activeCandidateIds.filter(
      (id) => !timesheetCandidateIds.has(id),
    ).length;
    const charts = await fetchDashboardCharts(this.prisma, {
      organizationId: params.organizationId,
      month,
      clientId: params.clientId,
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

  async overdueReviews(organizationId: string, month?: string) {
    const yearMonth = month
      ? this.resolveMonth(month)
      : previousYearMonth(this.resolveMonth());
    const prev = previousYearMonth(yearMonth);

    const activeCandidates = await this.prisma.candidate.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: CandidateStatus.ACTIVE,
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
        organizationId,
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
    organizationId: string;
    kpi: string;
    clientId?: string;
    health?: EngagementHealth;
    month?: string;
  }) {
    const month = this.resolveMonth(params.month);
    try {
      return await fetchKpiDetail(this.prisma, { ...params, month });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Unknown KPI')) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
