import { ReactNode } from 'react';

/**
 * Compact chart/table surface — distinct from KPI tiles, light chrome.
 */
export default function ChartPanel({
  title,
  kind = 'chart',
  children,
  className = '',
}: {
  title: string;
  kind?: 'chart' | 'table';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-[hsl(210_20%_98%)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-1.5">
        <span className="rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {kind === 'table' ? 'Table' : 'Chart'}
        </span>
        <h3 className="text-xs font-semibold text-slate-deep">{title}</h3>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}
