import type { ReactNode } from "react";

/** The "nothing here" line a rail panel falls back to, padded to keep the panel's height. */
export function RailEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
