import type { ReactNode } from "react";
import { PAGE_SUBTITLE, PAGE_TITLE } from "@/lib/layout";

/**
 * A page's title and the one line under it.
 *
 * The `h1` + subtitle pair, at console scale. `SectionHeading` is the same shape
 * one size down for a heading inside a page; the two used to disagree on the gap
 * below the subtitle (`mt-1` versus `mt-1.5`) and on whether the subtitle was
 * allowed to wrap onto two comfortable lines.
 *
 * `as` exists because an error card or a confirmation screen is a page's worth
 * of content without being a route — and it still needs one `h1`.
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
