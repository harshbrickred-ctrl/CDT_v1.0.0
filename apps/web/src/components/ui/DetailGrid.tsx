import { ReactNode } from 'react';

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function DetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-slate-deep">{value ?? '—'}</div>
    </div>
  );
}

export const clickableRowClass =
  'group cursor-pointer transition-colors duration-200 hover:bg-muted/40 active:bg-muted/55';
