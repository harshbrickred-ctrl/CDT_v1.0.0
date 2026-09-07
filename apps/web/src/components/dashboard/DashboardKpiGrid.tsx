import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, stagger } from '../../lib/motion';
import DashboardKpiTile, { DashboardKpiTileProps } from './DashboardKpiTile';

export default function DashboardKpiGrid({
  items,
  onItemClick,
}: {
  items: (DashboardKpiTileProps & { id: string; label: string })[];
  onItemClick?: (id: string, label: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      variants={stagger}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={fadeUp} className="h-full">
          <DashboardKpiTile
            {...item}
            onClick={
              onItemClick
                ? () => onItemClick(item.id, item.label)
                : undefined
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function DashboardSkeletonGrid() {
  return (
    <div className="mb-8 space-y-6">
      {['Candidates', 'Invoicing', 'Operations', 'Feedback'].map((section) => (
        <div key={section}>
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted/60" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: section === 'Invoicing' ? 6 : section === 'Candidates' ? 6 : section === 'Operations' ? 5 : 1 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardChartSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
    </div>
  );
}
