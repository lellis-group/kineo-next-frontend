import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SkeletonShape = "control" | "card" | "full";

const SHAPES: Record<SkeletonShape, string> = {
  control: "rounded-control",
  card: "rounded-card",
  full: "rounded-full",
};

/** A pulsing placeholder; size and background come from the caller. */
export function Skeleton({
  shape = "control",
  className,
  ...rest
}: ComponentProps<"div"> & { shape?: SkeletonShape }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-surface", SHAPES[shape], className)}
      {...rest}
    />
  );
}
