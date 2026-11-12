import type { ReactNode } from "react";
import { PAGE_SUBTITLE, PAGE_TITLE } from "@/lib/layout";

/**
 * A page's `h1` and subtitle. `as` serves screens that are a page's worth of
 * content without being a route.
 */
export function PageHeader({
  title,
  subtitle,
  as: Heading = "h1",
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <header className={className}>
      <Heading className={PAGE_TITLE}>{title}</Heading>
      {subtitle && <p className={PAGE_SUBTITLE}>{subtitle}</p>}
    </header>
  );
}
