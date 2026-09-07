export default function PublicId({
  value,
  className = '',
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-xs tracking-tight text-slate-deep ${className}`}
    >
      {value}
    </span>
  );
}
