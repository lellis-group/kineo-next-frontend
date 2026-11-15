import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A card's inner heading, or one section of a detail page. */
export function SectionTitle({
  children,
  as: Heading = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <Heading className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </Heading>
  );
}
