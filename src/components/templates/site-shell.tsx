"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site shell, sized by route. `/listings` and `/listings/mine` are
 * full-height workspaces (`h-dvh`, `<main>` scrolls, no footer); every other
 * page is a scrolling document. `usePathname` also runs during SSR, so the
 * right shape is in the first HTML.
 *
 * `header` and `footer` are passed in because they are server components.
 */
export function SiteShell({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  // An exact pair: `/listings/mine/[id]` is an ordinary document.
  const isFullHeightWorkspace =
    pathname === "/listings" || pathname === "/listings/mine";

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        isFullHeightWorkspace ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      {header}
      {/*
        `relative` keeps absolutely positioned descendants (the `sr-only` live
        regions) inside this scroller rather than giving the window a second
        scroll.
      */}
      <main
        className={cn(
          "flex-1",
          isFullHeightWorkspace &&
            "relative flex min-h-0 flex-col overflow-y-auto",
        )}
      >
        {children}
      </main>
      {!isFullHeightWorkspace && footer}
    </div>
  );
}
