import { ReactNode } from 'react';
import Card from './Card';

export default function FilterBar({
  children,
  actions,
  className = '',
  columns = 3,
}: {
  children: ReactNode;
  /** Optional row below filters (e.g. Reset), right-aligned. */
  actions?: ReactNode;
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}) {
  const lgCols =
    columns === 6
      ? 'lg:grid-cols-3 xl:grid-cols-6'
      : columns === 5
        ? 'lg:grid-cols-3 xl:grid-cols-5'
        : columns === 4
          ? 'lg:grid-cols-4'
          : 'lg:grid-cols-3';
  return (
    <Card accent className={`mb-6 ${className}`}>
      <div className={`grid gap-3 sm:grid-cols-2 ${lgCols}`}>{children}</div>
      {actions ? (
        <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
          {actions}
        </div>
      ) : null}
    </Card>
  );
}
