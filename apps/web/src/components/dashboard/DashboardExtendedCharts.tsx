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
import Card from '../ui/Card';
import PageSection from '../ui/PageSection';

const PAYMENT_COLORS: Record<string, string> = {
  PAID: 'hsl(152 45% 36%)',
  SENT: 'hsl(210 80% 48%)',
  APPROVED: 'hsl(38 92% 46%)',
  PENDING_REVIEW: 'hsl(215 16% 62%)',
  REJECTED: 'hsl(0 72% 48%)',
};

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: '1px solid hsl(214 18% 84%)',
  fontSize: '0.8125rem',
};

function truncateName(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function HeadcountByClientChart({
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
    <PageSection title="Active headcount by client">
      <Card accent className="!p-4 sm:!p-6">
        {rows.length === 0 ? (
          <ChartEmpty message="No active headcount for this scope." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="hsl(214 18% 84% / 0.6)"
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fontSize: 11 }}
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
                  radius={[0, 6, 6, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </PageSection>
  );
}

function PaymentStatusChart({
  data,
}: {
  data: DashboardCharts['paymentStatusByAmount'];
}) {
  return (
    <PageSection title="Payment status (by amount)">
      <Card accent className="!p-4 sm:!p-6">
        {data.length === 0 ? (
          <ChartEmpty message="No invoice amounts for this month." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_200px] lg:items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    animationDuration={600}
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
            <ul className="space-y-2.5">
              {data.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
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
      </Card>
    </PageSection>
  );
}

function RevenueTrendChart({
  data,
}: {
  data: DashboardCharts['revenueTrendByMonth'];
}) {
  return (
    <PageSection title="Revenue trend by month">
      <Card accent className="!p-4 sm:!p-6">
        {data.every((d) => d.revenue === 0) ? (
          <ChartEmpty message="No invoiced revenue in the last 6 months." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.6)"
                />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 100000 ? `${Math.round(v / 100000)}L` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value) => [formatInr(Number(value ?? 0)), 'Revenue']}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(152 45% 36%)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(152 45% 36%)' }}
                  activeDot={{ r: 6 }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </PageSection>
  );
}

function TopClientsByRevenueChart({
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
    <PageSection title="Top 5 clients by revenue">
      <Card accent className="!p-4 sm:!p-6">
        {rows.length === 0 ? (
          <ChartEmpty message="No client revenue for this month." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.6)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
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
                  radius={[6, 6, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </PageSection>
  );
}

function AtRiskClientsChart({
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
    <PageSection title="At-risk clients">
      <Card accent className="!p-4 sm:!p-6">
        {rows.length === 0 ? (
          <ChartEmpty message="No at-risk or escalated clients this month." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214 18% 84% / 0.6)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar
                  dataKey="atRisk"
                  name="At risk"
                  stackId="risk"
                  fill="hsl(38 92% 46%)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="escalated"
                  name="Escalated"
                  stackId="risk"
                  fill="hsl(0 72% 48%)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </PageSection>
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
        <RevenueTrendChart data={charts.revenueTrendByMonth} />
        <TopClientsByRevenueChart data={charts.topClientsByRevenue} />
      </div>
      <div className="mb-8">
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
      <div className="mb-8 h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
    </>
  );
}
