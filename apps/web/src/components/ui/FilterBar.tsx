import { ReactNode } from 'react';
import Card from './Card';

export default function FilterBar({
  children,
  className = '',
  columns = 3,
}: {
  children: ReactNode;
  className?: string;
  columns?: 3 | 4;
}) {
  const lgCols = columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';
  return (
    <Card accent className={`mb-6 ${className}`}>
      <div className={`grid gap-3 sm:grid-cols-2 ${lgCols}`}>{children}</div>
    </Card>
  );
}
