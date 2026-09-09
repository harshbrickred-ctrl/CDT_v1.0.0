import { ReactNode } from 'react';

/**
 * Chart/table surface — visually distinct from KPI tiles
 * (no gold accent bar, muted inset, dashed border, Chart chip).
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
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-slate-300/90 bg-[hsl(210_20%_97%)] shadow-inner ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-200/90 bg-[hsl(210_16%_94%)] px-4 py-2.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-deep ring-1 ring-slate-deep/15">
          {kind === 'table' ? 'Table' : 'Chart'}
        </span>
        <h3 className="text-sm font-semibold text-slate-deep">{title}</h3>
      </div>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </div>
  );
}
