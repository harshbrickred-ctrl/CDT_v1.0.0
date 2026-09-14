import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import {
  clientsApi,
  dashboardApi,
  apiErrorMessage,
  usersApi,
} from '../lib/api';
import { scopeClientsForUser } from '../lib/client-scope';
import { formatInr, formatPct } from '../lib/format';
import { fadeUp } from '../lib/motion';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import FilterBar from '../components/ui/FilterBar';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import DashboardKpiGrid, {
  DashboardChartSkeleton,
  DashboardSkeletonGrid,
} from '../components/dashboard/DashboardKpiGrid';
import DashboardSection, {
  DashboardBlockLabel,
} from '../components/dashboard/DashboardSection';
import ChartPanel from '../components/dashboard/ChartPanel';
import HealthDonutChart from '../components/dashboard/HealthDonutChart';
import TopClientsBarChart from '../components/dashboard/TopClientsBarChart';
import {
  AtRiskClientsChart,
  DashboardExtendedChartsSkeleton,
  HeadcountByClientChart,
  InvoiceStatusBarsChart,
  PaymentStatusChart,
  RevenueTrendChart,
  TopClientsByRevenueChart,
} from '../components/dashboard/DashboardExtendedCharts';
import OverdueReviewsAlert from '../components/dashboard/OverdueReviewsAlert';
import DashboardKpiDetailModal from '../components/dashboard/DashboardKpiDetailModal';
import { labelClass, tdClass, thClass } from '../components/ui/styles';
import type { DashboardKpiId } from '../lib/types';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const kpiIcons = {
  users: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  track: (
    <Icon>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icon>
  ),
  risk: (
    <Icon>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </Icon>
  ),
  escalate: (
    <Icon>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </Icon>
  ),
  released: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </Icon>
  ),
  invoice: (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </Icon>
  ),
  money: (
    <Icon>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  ),
  leave: (
    <Icon>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </Icon>
  ),
  pending: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  ),
  utilization: (
    <Icon>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </Icon>
  ),
  tat: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  ),
  feedback: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
};

function formatTodayHint() {
  return `As of ${new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} — ignores month filter`;
}

export default function DashboardPage() {
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [clientId, setClientId] = useState('');
  const [health, setHealth] = useState('');
  /** Empty string = all months (overall invoicing). */
  const [month, setMonth] = useState('');
  const [deliveryOwnerUserId, setDeliveryOwnerUserId] = useState('');
  const [accountOwnerUserId, setAccountOwnerUserId] = useState('');
  const [selectedKpi, setSelectedKpi] = useState<{
    id: DashboardKpiId;
    label: string;
  } | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'dashboard-owners'],
    queryFn: () => usersApi.list({ pageSize: 200 }),
    enabled: isAdmin,
  });

  const deliveryOwnerOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((u) => u.role === 'DELIVERY_OWNER'),
    [usersQuery.data],
  );
  const accountOwnerOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((u) => u.role === 'ACCOUNT_OWNER'),
    [usersQuery.data],
  );

  const roleScopedClients = useMemo(
    () =>
      scopeClientsForUser(
        clientsQuery.data?.items ?? [],
        user?.ownedClientIds,
      ),
    [clientsQuery.data?.items, user?.ownedClientIds],
  );

  const scopedClients = useMemo(() => {
    let list = roleScopedClients;
    if (deliveryOwnerUserId) {
      list = list.filter((c) =>
        (c.deliveryOwners ?? []).some((o) => o.id === deliveryOwnerUserId),
      );
    }
    if (accountOwnerUserId) {
      list = list.filter((c) =>
        (c.accountOwners ?? []).some((o) => o.id === accountOwnerUserId),
      );
    }
    return list;
  }, [roleScopedClients, deliveryOwnerUserId, accountOwnerUserId]);

  useEffect(() => {
    if (clientId && !scopedClients.some((c) => c.id === clientId)) {
      setClientId('');
    }
  }, [clientId, scopedClients]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (month) p.month = month;
    if (clientId) p.clientId = clientId;
    if (health) p.health = health;
    if (deliveryOwnerUserId) p.deliveryOwnerUserId = deliveryOwnerUserId;
    if (accountOwnerUserId) p.accountOwnerUserId = accountOwnerUserId;
    return p;
  }, [clientId, health, month, deliveryOwnerUserId, accountOwnerUserId]);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => dashboardApi.summary(params),
  });

  const overdueQuery = useQuery({
    queryKey: [
      'dashboard',
      'overdue-reviews',
      month || 'default',
      deliveryOwnerUserId || '',
      accountOwnerUserId || '',
    ],
    queryFn: () =>
      dashboardApi.overdueReviews({
        ...(month ? { month } : {}),
        ...(deliveryOwnerUserId
          ? { deliveryOwnerUserId }
          : {}),
        ...(accountOwnerUserId ? { accountOwnerUserId } : {}),
      }),
  });

  const summary = summaryQuery.data;
  const topClients = summary?.topClients ?? [];
  const isLoading = summaryQuery.isLoading;
  const isFetching = summaryQuery.isFetching && !summaryQuery.isLoading;

  const candidateKpis = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total Candidates (All Statuses)',
        value: summary?.totalCandidates ?? 0,
        icon: kpiIcons.users,
      },
      {
        id: 'active',
        label: 'Active Candidates',
        value: summary?.activeCandidates ?? 0,
        icon: kpiIcons.users,
      },
      {
        id: 'on-track',
        label: 'On Track Engagements',
        value: summary?.onTrackEngagements ?? 0,
        icon: kpiIcons.track,
        accent: 'from-success/40 via-success to-success/40',
      },
      {
        id: 'at-risk',
        label: 'At Risk Engagements',
        value: summary?.atRiskEngagements ?? 0,
        icon: kpiIcons.risk,
        accent: 'from-warning/40 via-warning to-warning/40',
      },
      {
        id: 'escalations',
        label: 'Escalations',
        value: summary?.escalations ?? 0,
        icon: kpiIcons.escalate,
        accent: 'from-destructive/40 via-destructive to-destructive/40',
      },
      {
        id: 'released-total',
        label: 'Total Released Candidates',
        value: summary?.totalReleasedCandidates ?? 0,
        icon: kpiIcons.released,
      },
    ],
    [summary],
  );

  const invoiceKpis = useMemo(
    () => [
      {
        id: 'total-invoiced',
        label: 'Total Invoiced',
        value: summary?.totalInvoiced ?? 0,
        formatValue: formatInr,
        icon: kpiIcons.invoice,
      },
      {
        id: 'draft-invoiced',
        label: 'Draft Invoiced',
        value: summary?.draftInvoiced ?? 0,
        formatValue: formatInr,
        icon: kpiIcons.invoice,
      },
      {
        id: 'outstanding',
        label: 'Outstanding (Sent)',
        value: summary?.outstandingAmount ?? 0,
        formatValue: formatInr,
        icon: kpiIcons.money,
      },
      {
        id: 'paid',
        label: 'Paid',
        value: summary?.paidAmount ?? 0,
        formatValue: formatInr,
        icon: kpiIcons.money,
        accent: 'from-success/40 via-success to-success/40',
      },
      {
        id: 'rejected-inv',
        label: 'Rejected',
        value: summary?.rejectedInvoices ?? 0,
        icon: kpiIcons.risk,
      },
      {
        id: 'draft-inv',
        label: 'Draft Invoices',
        value: summary?.draftInvoices ?? 0,
        icon: kpiIcons.invoice,
      },
      {
        id: 'overdue-inv',
        label: 'Overdue Invoices',
        value: summary?.overdueInvoices ?? 0,
        icon: kpiIcons.escalate,
        accent: 'from-destructive/40 via-destructive to-destructive/40',
      },
    ],
    [summary],
  );

  const operationsKpis = useMemo(
    () => [
      {
        id: 'missing-ts',
        label: 'Missing Timesheets',
        value: summary?.missingTimesheetsCount ?? 0,
        icon: kpiIcons.invoice,
        accent: 'from-destructive/40 via-destructive to-destructive/40',
      },
      {
        id: 'pending-ts',
        label: 'Pending Timesheet Approvals',
        value: summary?.pendingTimesheetApprovals ?? 0,
        icon: kpiIcons.invoice,
      },
      {
        id: 'approved-ts',
        label: 'Approved Timesheets',
        value: summary?.approvedTimesheetsCount ?? 0,
        icon: kpiIcons.track,
        accent: 'from-success/40 via-success to-success/40',
      },
      {
        id: 'pending-leave',
        label: 'Pending Leave Approvals',
        value: summary?.pendingLeaveApprovals ?? 0,
        icon: kpiIcons.pending,
      },
      {
        id: 'on-leave',
        label: 'On Leave Today',
        value: summary?.onLeaveToday ?? 0,
        hint: formatTodayHint(),
        icon: kpiIcons.leave,
        accent: 'from-sky-400/40 via-sky-500 to-sky-400/40',
      },
      {
        id: 'avg-util',
        label: 'Avg Utilization %',
        value:
          summary?.avgUtilizationPct != null ? summary.avgUtilizationPct : '—',
        formatValue: (n: number) => formatPct(n),
        icon: kpiIcons.utilization,
      },
      {
        id: 'avg-tat',
        label: 'Avg Payment TAT (Days)',
        value:
          summary?.avgPaymentTatDays != null ? summary.avgPaymentTatDays : '—',
        formatValue: (n: number) => `${n}d`,
        icon: kpiIcons.tat,
      },
    ],
    [summary],
  );

  const feedbackKpis = useMemo(
    () => [
      {
        id: 'feedback',
        label: 'Good Client Feedback',
        value: summary?.goodClientFeedback ?? 0,
        icon: kpiIcons.feedback,
        accent: 'from-success/40 via-success to-success/40',
      },
    ],
    [summary],
  );

  function handleKpiClick(id: string, label: string) {
    setSelectedKpi({ id: id as DashboardKpiId, label });
  }

  const kpiDetailParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (month) p.month = month;
    if (clientId) p.clientId = clientId;
    if (health) p.health = health;
    if (deliveryOwnerUserId) p.deliveryOwnerUserId = deliveryOwnerUserId;
    if (accountOwnerUserId) p.accountOwnerUserId = accountOwnerUserId;
    return p;
  }, [clientId, health, month, deliveryOwnerUserId, accountOwnerUserId]);

  function resetFilters() {
    setClientId('');
    setHealth('');
    setMonth('');
    setDeliveryOwnerUserId('');
    setAccountOwnerUserId('');
  }

  const hasFilters =
    clientId !== '' ||
    health !== '' ||
    month !== '' ||
    deliveryOwnerUserId !== '' ||
    accountOwnerUserId !== '';

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={
          month
            ? 'Portfolio health, billing, and operational KPIs for the selected month.'
            : 'Portfolio health, billing, and operational KPIs across all months.'
        }
      />

      <FilterBar columns={isAdmin ? 3 : 2}>
        {isAdmin && (
          <Select
            id="dash-delivery-owner"
            label="Delivery Owner"
            value={deliveryOwnerUserId}
            onChange={(e) => setDeliveryOwnerUserId(e.target.value)}
          >
            <option value="">All delivery owners</option>
            {deliveryOwnerOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        )}
        {isAdmin && (
          <Select
            id="dash-account-owner"
            label="Account Owner"
            value={accountOwnerUserId}
            onChange={(e) => setAccountOwnerUserId(e.target.value)}
          >
            <option value="">All account owners</option>
            {accountOwnerOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        )}
        <Select
          id="dash-client"
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">All clients</option>
          {scopedClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          id="dash-health"
          label="Health"
          value={health}
          onChange={(e) => setHealth(e.target.value)}
        >
          <option value="">All</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
          <option value="ESCALATED">Escalated</option>
        </Select>
        <div>
          <Input
            id="dash-month"
            label="Month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {month ? 'Scoped to selected month' : 'All months (overall)'}
          </p>
        </div>
        <div>
          <span className={labelClass} aria-hidden>
            &nbsp;
          </span>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={resetFilters}
            disabled={!hasFilters}
          >
            Reset
          </Button>
        </div>
      </FilterBar>

      {summaryQuery.isError && (
        <Alert tone="error" className="mb-6">
          {apiErrorMessage(summaryQuery.error, 'Could not load dashboard')}
        </Alert>
      )}

      {isLoading ? (
        <>
          <DashboardSkeletonGrid />
          <DashboardChartSkeleton />
          <DashboardExtendedChartsSkeleton />
        </>
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          <DashboardSection
            title="Candidates & engagements"
            description={
              month
                ? 'Headcount, health, and risk signals for the selected month.'
                : 'Headcount, health, and risk signals across all months.'
            }
          >
            <div>
              <DashboardBlockLabel>KPI cards</DashboardBlockLabel>
              <DashboardKpiGrid
                items={candidateKpis}
                onItemClick={handleKpiClick}
              />
            </div>
            <div>
              <DashboardBlockLabel>Charts</DashboardBlockLabel>
              <motion.div
                className="grid gap-4 lg:grid-cols-2"
                variants={fadeUp}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
              >
                <HealthDonutChart data={summary?.healthChart ?? []} />
                <AtRiskClientsChart
                  data={summary?.charts?.atRiskClients ?? []}
                />
              </motion.div>
              <div className="mt-4">
                <HeadcountByClientChart
                  data={summary?.charts?.headcountByClient ?? []}
                />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Approvals & attendance"
            description="Timesheet and leave workflow plus utilization by client."
          >
            <div>
              <DashboardBlockLabel>KPI cards</DashboardBlockLabel>
              <DashboardKpiGrid
                items={operationsKpis}
                onItemClick={handleKpiClick}
              />
            </div>
            <div>
              <DashboardBlockLabel>Charts & tables</DashboardBlockLabel>
              <div className="grid gap-4 lg:grid-cols-2">
                <TopClientsBarChart clients={topClients} />
                <ChartPanel title="Top 3 clients" kind="table">
                  {topClients.length === 0 ? (
                    <EmptyState
                      title="No client rollup yet"
                      description="Once candidates and reviews exist for this month, client headcount will appear here."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className={thClass}>Client</th>
                            <th className={thClass}>Headcount</th>
                            <th className={thClass}>Avg utilization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topClients.map((row, i) => (
                            <tr
                              key={row.clientId ?? `${row.name}-${i}`}
                              className="group transition-colors hover:bg-white/60"
                            >
                              <td className={tdClass}>{row.name}</td>
                              <td className={tdClass}>{row.activeHeadcount}</td>
                              <td className={tdClass}>
                                {formatPct(row.avgUtilization)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ChartPanel>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Invoicing"
            description="Billing amounts, payment status, and revenue trends."
          >
            <div>
              <DashboardBlockLabel>KPI cards</DashboardBlockLabel>
              <DashboardKpiGrid
                items={invoiceKpis}
                onItemClick={handleKpiClick}
              />
            </div>
            <div>
              <DashboardBlockLabel>Charts</DashboardBlockLabel>
              <div className="grid gap-4 lg:grid-cols-2">
                <PaymentStatusChart
                  data={summary?.charts?.paymentStatusByAmount ?? []}
                />
                <InvoiceStatusBarsChart
                  data={summary?.charts?.invoiceStatusBars ?? []}
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <RevenueTrendChart
                  data={summary?.charts?.revenueTrendByMonth ?? []}
                />
                <TopClientsByRevenueChart
                  data={summary?.charts?.topClientsByRevenue ?? []}
                />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Feedback"
            description="Client feedback signals from delivery reviews."
          >
            <div>
              <DashboardBlockLabel>KPI cards</DashboardBlockLabel>
              <DashboardKpiGrid
                items={feedbackKpis}
                onItemClick={handleKpiClick}
              />
            </div>
          </DashboardSection>
        </div>
      )}

      <OverdueReviewsAlert
        count={overdueQuery.data?.count ?? 0}
        month={overdueQuery.data?.month}
      />

      <DashboardKpiDetailModal
        open={selectedKpi != null}
        kpiId={selectedKpi?.id ?? null}
        title={selectedKpi?.label ?? ''}
        params={kpiDetailParams}
        onClose={() => setSelectedKpi(null)}
      />
    </div>
  );
}
