export default function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 text-sm text-muted-foreground">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden
      />
      {label}
    </div>
  );
}
