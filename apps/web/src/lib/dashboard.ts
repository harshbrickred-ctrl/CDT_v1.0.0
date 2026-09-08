import type { DashboardSummary, DashboardSummaryRaw } from './types';



export function normalizeDashboardSummary(

  raw: DashboardSummaryRaw,

): DashboardSummary {

  const breakdown = raw.healthBreakdown ?? {};

  const healthChart =

    raw.healthChart ??

    [

      { key: 'ON_TRACK', label: 'On Track', count: breakdown.onTrack ?? 0 },

      { key: 'AT_RISK', label: 'At Risk', count: breakdown.atRisk ?? 0 },

      {

        key: 'ESCALATED',

        label: 'Escalated',

        count: breakdown.escalated ?? 0,

      },

    ];



  return {

    month: raw.month ?? '',

    activeCandidates: raw.activeCandidates ?? 0,

    totalCandidates: raw.totalCandidates ?? 0,

    onTrackEngagements:

      raw.onTrackEngagements ?? breakdown.onTrack ?? 0,

    atRiskEngagements: raw.atRiskEngagements ?? breakdown.atRisk ?? 0,

    escalations: raw.escalations ?? breakdown.escalated ?? 0,

    totalReleasedCandidates: raw.totalReleasedCandidates ?? 0,

    totalInvoiced: raw.totalInvoiced ?? 0,

    paidAmount: raw.paidAmount ?? 0,

    outstandingAmount: raw.outstandingAmount ?? 0,

    rejectedInvoices: raw.rejectedInvoices ?? 0,

    draftInvoices: raw.draftInvoices ?? 0,

    overdueInvoices: raw.overdueInvoices ?? 0,

    onLeaveToday: raw.onLeaveToday ?? 0,

    pendingLeaveApprovals: raw.pendingLeaveApprovals ?? 0,

    pendingTimesheetApprovals: raw.pendingTimesheetApprovals ?? 0,

    approvedTimesheetsCount: raw.approvedTimesheetsCount ?? 0,

    avgUtilizationPct: raw.avgUtilizationPct ?? null,

    avgPaymentTatDays: raw.avgPaymentTatDays ?? null,

    releasedInMonth: raw.releasedInMonth ?? 0,

    goodClientFeedback: raw.goodClientFeedback ?? 0,

    missingTimesheetsCount: raw.missingTimesheetsCount ?? 0,

    healthBreakdown: {

      onTrack: breakdown.onTrack ?? 0,

      atRisk: breakdown.atRisk ?? 0,

      escalated: breakdown.escalated ?? 0,

    },

    healthChart,

    topClients: (raw.topClients ?? []).slice(0, 3).map((c) => ({
      clientId: c.clientId,
      name: c.name,
      activeHeadcount: c.activeHeadcount ?? 0,
      avgUtilization: c.avgUtilization ?? null,
    })),

    charts: {
      headcountByClient: raw.charts?.headcountByClient ?? [],
      paymentStatusByAmount: raw.charts?.paymentStatusByAmount ?? [],
      invoiceStatusBars: raw.charts?.invoiceStatusBars ?? [],
      revenueTrendByMonth: raw.charts?.revenueTrendByMonth ?? [],
      topClientsByRevenue: raw.charts?.topClientsByRevenue ?? [],
      atRiskClients: raw.charts?.atRiskClients ?? [],
    },
  };
}


