import { ReactNode } from 'react';
import Card from './Card';

export default function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="!p-4 sm:!p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-deep">
        {value ?? '—'}
      </p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
