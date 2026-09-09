import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardCharts } from '../../lib/types';
import { formatInr } from '../../lib/format';
import ChartPanel from './ChartPanel';

const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'hsl(152 45% 36%)',
  SENT: 'hsl(210 80% 48%)',
  APPROVED: 'hsl(38 92% 46%)',
  PENDING_REVIEW: 'hsl(215 16% 62%)',
  REJECTED: 'hsl(0 72% 48%)',
};

const tooltipStyle = {
  borderRadius: '0.5rem',
  border: '1px solid hsl(214 18% 84%)',
  fontSize: '0.75rem',
};

function truncateName(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

const BAR_RADIUS_H = [0, 3, 3, 0] as [number, number, number, number];
const BAR_RADIUS_V = [3, 3, 0, 0] as [number, number, number, number];
const MAX_BAR = 16;

export function HeadcountByClientChart({
  data,
}: {
  data: DashboardCharts['headcountByClient'];
}) {
  const rows = data.map((c) => ({
    name: truncateName(c.name),
    fullName: c.name,
    headcount: c.headcount,
  }));

  return (
    <ChartPanel title="Active headcount by client">
        {rows.length === 0 ? (
          <ChartEmpty message="No active headcount for this scope." />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 2, right: 12, left: 4, bottom: 2 }}
                barCategoryGap="32%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="hsl(214 18% 84% / 0.5)"
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [value ?? 0, 'Headcount']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="headcount"
                  fill="hsl(210 80% 48%)"
                  maxBarSize={MAX_BAR}
                  radius={BAR_RADIUS_H}
                  animationDuration={400}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
  );
}

export function PaymentStatusChart({
  data,
}: {
  data: DashboardCharts['paymentStatusByAmount'];
}) {
  return (
    <ChartPanel title="Payment status (by amount)">
        {data.length === 0 ? (
          <ChartEmpty message="No invoice amounts for this month." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_140px] lg:items-center">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="78%"
                    paddingAngle={2}
                    animationDuration={400}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={PAYMENT_COLORS[entry.key] ?? 'hsl(215 16% 70%)'}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatInr(Number(value ?? 0)), 'Amount']}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5">
              {data.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          PAYMENT_COLORS[item.key] ?? 'hsl(215 16% 70%)',
                      }}
                    />
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-deep">
                    {formatInr(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartPanel>
  );
}

export function RevenueTrendChart({
  data,
}: {
  data: DashboardCharts['revenueTrendByMonth'];
}) {
  return (
    <ChartPanel title="Revenue trend by month">
        {data.every((d) => d.revenue === 0) ? (
          <ChartEmpty message="No invoiced revenue in the last 6 months." />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 4, right: 12, left: 4, bottom: 2 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.5)"
                />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    v >= 100000 ? `${Math.round(v / 100000)}L` : String(v)
                  }
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [formatInr(Number(value ?? 0)), 'Revenue']}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(152 45% 36%)"
                  strokeWidth={1.75}
                  dot={{ r: 2.5, fill: 'hsl(152 45% 36%)' }}
                  activeDot={{ r: 4 }}
                  animationDuration={400}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
  );
}

export function TopClientsByRevenueChart({
  data,
}: {
  data: DashboardCharts['topClientsByRevenue'];
}) {
  const rows = data.map((c) => ({
    name: truncateName(c.name, 14),
    fullName: c.name,
    revenue: c.revenue,
  }));

  return (
    <ChartPanel title="Top 5 clients by revenue">
        {rows.length === 0 ? (
          <ChartEmpty message="No client revenue for this month." />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 4, right: 6, left: 4, bottom: 36 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.5)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  angle={-28}
                  textAnchor="end"
                  height={42}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={40}
                  tickFormatter={(v) =>
                    v >= 100000 ? `${Math.round(v / 100000)}L` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value) => [formatInr(Number(value ?? 0)), 'Revenue']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(38 92% 46%)"
                  maxBarSize={MAX_BAR}
                  radius={BAR_RADIUS_V}
                  animationDuration={400}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
  );
}

export function AtRiskClientsChart({
  data,
}: {
  data: DashboardCharts['atRiskClients'];
}) {
  const rows = data.map((c) => ({
    name: truncateName(c.name, 14),
    fullName: c.name,
    atRisk: c.atRiskCount,
    escalated: c.escalatedCount,
  }));

  return (
    <ChartPanel title="At-risk clients">
        {rows.length === 0 ? (
          <ChartEmpty message="No at-risk or escalated clients this month." />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 4, right: 6, left: 4, bottom: 36 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.5)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  angle={-28}
                  textAnchor="end"
                  height={42}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Bar
                  dataKey="atRisk"
                  name="At risk"
                  stackId="risk"
                  fill="hsl(38 92% 46%)"
                  maxBarSize={MAX_BAR}
                />
                <Bar
                  dataKey="escalated"
                  name="Escalated"
                  stackId="risk"
                  fill="hsl(0 72% 48%)"
                  maxBarSize={MAX_BAR}
                  radius={BAR_RADIUS_V}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
  );
}

const INVOICE_BAR_COLORS: Record<string, string> = {
  draft: 'hsl(215 16% 62%)',
  approved: 'hsl(210 80% 48%)',
  outstanding: 'hsl(38 92% 46%)',
  paid: 'hsl(152 45% 36%)',
  overdue: 'hsl(0 72% 48%)',
  rejected: 'hsl(0 55% 42%)',
  invoiced: 'hsl(222 28% 28%)',
};

export function InvoiceStatusBarsChart({
  data,
}: {
  data: DashboardCharts['invoiceStatusBars'];
}) {
  const rows = data.map((d) => ({
    ...d,
    fill: INVOICE_BAR_COLORS[d.key] ?? 'hsl(210 80% 48%)',
  }));

  return (
    <ChartPanel title="Invoicing status (by amount)">
        {rows.length === 0 ? (
          <ChartEmpty message="No invoice amounts for this month." />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 4, right: 6, left: 4, bottom: 4 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.5)"
                />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={40}
                  tickFormatter={(v) =>
                    v >= 100000 ? `${Math.round(v / 100000)}L` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    formatInr(Number(value ?? 0)),
                    'Amount',
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="amount"
                  maxBarSize={MAX_BAR}
                  radius={BAR_RADIUS_V}
                  animationDuration={400}
                >
                  {rows.map((row) => (
                    <Cell key={row.key} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
  );
}

export default function DashboardExtendedCharts({
  charts,
}: {
  charts: DashboardCharts;
}) {
  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <HeadcountByClientChart data={charts.headcountByClient} />
        <PaymentStatusChart data={charts.paymentStatusByAmount} />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <InvoiceStatusBarsChart data={charts.invoiceStatusBars} />
        <RevenueTrendChart data={charts.revenueTrendByMonth} />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <TopClientsByRevenueChart data={charts.topClientsByRevenue} />
        <AtRiskClientsChart data={charts.atRiskClients} />
      </div>
    </>
  );
}

export function DashboardExtendedChartsSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      </div>
    </>
  );
}
