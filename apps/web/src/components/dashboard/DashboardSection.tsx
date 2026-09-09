import { ReactNode } from 'react';

/** Major dashboard band: KPIs + related charts for one domain. */
export default function DashboardSection({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mb-10 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_12px_40px_-28px_hsl(222_28%_16%_/_0.18)] ${className}`}
    >
      <header className="border-b border-border/70 bg-gradient-to-r from-muted/70 via-muted/40 to-transparent px-5 py-4 sm:px-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-deep sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-6 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function DashboardBlockLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}
