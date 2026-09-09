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
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
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
    <div className="mb-8 space-y-8">
      {['Candidates', 'Invoicing', 'Operations', 'Feedback'].map((section) => (
        <div
          key={section}
          className="overflow-hidden rounded-3xl border border-border/70"
        >
          <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted/80" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({
                length:
                  section === 'Invoicing'
                    ? 6
                    : section === 'Candidates'
                      ? 6
                      : section === 'Operations'
                        ? 5
                        : 1,
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
                />
              ))}
            </div>
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
