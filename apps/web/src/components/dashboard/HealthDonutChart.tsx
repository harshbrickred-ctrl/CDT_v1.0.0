import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DashboardHealthChartItem } from '../../lib/types';
import ChartPanel from './ChartPanel';

const COLORS: Record<string, string> = {
  ON_TRACK: 'hsl(152 45% 36%)',
  AT_RISK: 'hsl(38 92% 46%)',
  ESCALATED: 'hsl(0 72% 48%)',
};

export default function HealthDonutChart({
  data,
}: {
  data: DashboardHealthChartItem[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.filter((d) => d.count > 0);

  return (
    <ChartPanel title="Engagement health">
      <div className="grid gap-3 lg:grid-cols-[1fr_132px] lg:items-center">
        <div className="h-40 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No reviews for this scope yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="78%"
                  paddingAngle={2}
                  animationDuration={400}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={COLORS[entry.key] ?? 'hsl(215 16% 70%)'}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value ?? 0, String(name)]}
                  contentStyle={{
                    borderRadius: '0.5rem',
                    border: '1px solid hsl(214 18% 84%)',
                    fontSize: '0.75rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
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
                    backgroundColor: COLORS[item.key] ?? 'hsl(215 16% 70%)',
                  }}
                />
                {item.label}
              </span>
              <span className="font-semibold tabular-nums text-slate-deep">
                {item.count}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-slate-deep">{total}</span>
          </li>
        </ul>
      </div>
    </ChartPanel>
  );
}
