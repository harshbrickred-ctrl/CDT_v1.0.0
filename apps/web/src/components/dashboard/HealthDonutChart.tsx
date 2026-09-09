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
      <div className="grid gap-6 lg:grid-cols-[1fr_200px] lg:items-center">
        <div className="h-64 w-full">
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
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  animationDuration={600}
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
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(214 18% 84%)',
                    fontSize: '0.8125rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="space-y-3">
          {data.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
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
          <li className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-slate-deep">{total}</span>
          </li>
        </ul>
      </div>
    </ChartPanel>
  );
}
