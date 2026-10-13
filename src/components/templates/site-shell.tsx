"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site shell — header, the scrolling region, and the footer — sized by
 * route.
 *
 * A client component for one reason: the browse feed (`/listings`) is the one
 * screen that is a full-height workspace rather than a scrolling document. Its
 * content — facets rail, map and results table side by side — is built to fill
 * the window and scroll in its own regions, so the shell bounds itself to the
 * viewport (`h-dvh`, `overflow-hidden`), makes `<main>` the one flexible band,
 * and drops the marketing footer entirely — every pixel of height goes to the
 * workspace. Every other page is an ordinary document: it grows with its
 * content, scrolls the page, and keeps its footer.
 *
 * The two shapes are chosen here, by path, rather than baked into the shared
 * layout, so the full-height treatment stays confined to the feed and no other
 * console page is changed. `usePathname` runs on the server for the first paint
 * as well — client components are server-rendered — so the correct shape is in
 * the HTML from the start; no class is swapped in after hydration and nothing
 * shifts on arrival.
 *
 * `header` and `footer` are passed in rather than imported because both are
 * server components (`AppHeaderLoader` is async): a client component may render
 * a server component it was handed, but may not import one directly.
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

  // The browse feed only. `/listings/mine` and its detail pages are ordinary
  // documents and keep the page-scroll shell. An exact match, so the guard
  // cannot leak onto a sibling route the way a `startsWith("/listings")` would.
  const isFullHeightWorkspace = pathname === "/listings";

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        isFullHeightWorkspace ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      {header}
      <main
        className={cn(
          "flex-1",
          isFullHeightWorkspace && "flex min-h-0 flex-col overflow-y-auto",
        )}
      >
        {children}
      </main>
      {/*
        The footer is the marketing chrome, and the browse feed has none: on
        `/listings` the whole point is that the workspace fills the window edge
        to edge, so the footer is dropped and `<main>` takes the full height
        under the header. Every other page keeps it — it is ordinary document
        flow, and the footer belongs at the bottom of the scroll.
      */}
      {!isFullHeightWorkspace && footer}
    </div>
  );
}
