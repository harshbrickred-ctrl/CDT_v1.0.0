import { healthLabel } from '../../lib/format';

const styles: Record<string, string> = {
  ON_TRACK: 'bg-success/15 text-success border-success/30',
  AT_RISK: 'bg-warning/15 text-warning border-warning/35',
  ESCALATED: 'bg-destructive/10 text-destructive border-destructive/30',
};

const dots: Record<string, string> = {
  ON_TRACK: 'bg-success',
  AT_RISK: 'bg-warning',
  ESCALATED: 'bg-destructive',
};

export default function HealthBadge({
  health,
  className = '',
}: {
  health?: string | null;
  className?: string;
}) {
  if (!health) {
    return (
      <span
        className={`inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground ${className}`}
      >
        —
      </span>
    );
  }
  const tone = styles[health] ?? 'bg-muted text-muted-foreground border-border';
  const dot = dots[health] ?? 'bg-muted-foreground';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {healthLabel(health)}
    </span>
  );
}
