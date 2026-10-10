import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { BACK_LINK } from "@/lib/layout";

/**
 * Back link to the parent screen — the first thing on every detail page.
 *
 * A component rather than a className constant because the whole thing is
 * three parts that have to stay together: the arrow, the weight and the hover
 * state. Written out by hand twice, it had already picked up a difference — one
 * copy was nudged out of alignment with the arrow on the other — which is
 * exactly what a token cannot prevent and a component can.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(BACK_LINK, className)}>
      <ArrowLeftIcon className="h-4 w-4" />
      {children}
    </Link>
  );
}
