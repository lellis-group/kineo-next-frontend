export interface StatRowProps {
  label: string;
  value: string;
  /** Highlights the value in green (positive indicator). */
  accent?: boolean;
  /** Renders the value muted (missing/optional data). */
  muted?: boolean;
}

export function StatRow({
  label,
  value,
  accent = false,
  muted = false,
}: StatRowProps) {
  const valueClasses = muted
    ? "font-medium text-muted"
    : `font-medium ${accent ? "text-success" : "text-foreground"}`;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm ${valueClasses}`}>{value}</span>
    </div>
  );
}
