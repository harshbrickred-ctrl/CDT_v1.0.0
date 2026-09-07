import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardTopClient } from '../../lib/types';
import { formatPct } from '../../lib/format';
import Card from '../ui/Card';
import PageSection from '../ui/PageSection';

export default function TopClientsBarChart({
  clients,
}: {
  clients: DashboardTopClient[];
}) {
  const top = clients.slice(0, 3).map((c) => ({
    name: c.name.length > 18 ? `${c.name.slice(0, 16)}…` : c.name,
    fullName: c.name,
    headcount: c.activeHeadcount,
    utilization: c.avgUtilization,
  }));

  return (
    <PageSection title="Top 3 clients">
      <Card accent className="!p-4 sm:!p-6">
        {top.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No client headcount for this scope yet.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top}
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
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, key) => {
                    const n = Number(value ?? 0);
                    if (key === 'utilization') return [formatPct(n), 'Avg utilization'];
                    return [n, 'Headcount'];
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(214 18% 84%)',
                    fontSize: '0.8125rem',
                  }}
                />
                <Bar
                  dataKey="headcount"
                  fill="hsl(38 92% 46%)"
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
