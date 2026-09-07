const tones: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success border-success/25',
  RELEASED: 'bg-muted text-muted-foreground border-border',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PENDING: 'bg-warning/15 text-warning border-warning/30',
  APPROVED: 'bg-success/15 text-success border-success/25',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/25',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
};

const dots: Record<string, string> = {
  ACTIVE: 'bg-success',
  RELEASED: 'bg-muted-foreground',
  DRAFT: 'bg-muted-foreground',
  PENDING: 'bg-warning',
  APPROVED: 'bg-success',
  REJECTED: 'bg-destructive',
  CANCELLED: 'bg-muted-foreground',
};

export default function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const tone = tones[status] ?? 'bg-muted text-muted-foreground border-border';
  const dot = dots[status] ?? 'bg-muted-foreground';
  const pulse = status === 'PENDING';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-transform duration-200 ${tone}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dot} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      {status.replaceAll('_', ' ')}
    </span>
  );
}
