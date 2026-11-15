import type { ReactNode } from "react";

/**
 * One fact in a panel's list: a muted mark and label, the value on the
 * right. Rows go in a `<dl>` with `divide-y`; the first and last drop their
 * outer padding so the list sits flush in the panel.
 */
export function FactRow({
  mark,
  label,
  children,
}: {
  /** An icon; sized and toned here. */
  mark: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        aria-hidden="true"
        className="grid size-4 shrink-0 place-items-center text-muted [&>svg]:size-4"
      >
        {mark}
      </span>
      <dt className="min-w-0 flex-1 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground tabular-nums">
        {children}
      </dd>
    </div>
  );
}
