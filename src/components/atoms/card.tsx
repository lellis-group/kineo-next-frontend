import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** A boxed surface; passes through every div prop (`data-*`, `style`). */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface", className)}
      {...rest}
    />
  );
}
