import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { BACK_LINK } from "@/lib/layout";

/** Back link to the parent screen — the first thing on every detail page. */
export function BackLink({
  href,
  children,
  replace,
  className,
}: {
  href: string;
  children: ReactNode;
  /** Replaces the history entry instead of pushing one (leaving a form). */
  replace?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} replace={replace} className={cn(BACK_LINK, className)}>
      <ArrowLeftIcon className="h-4 w-4" />
      {children}
    </Link>
  );
}
