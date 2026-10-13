"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site shell — header, the scrolling region, and the footer — sized by
 * route.
 *
 * A client component for one reason: `/listings` and `/listings/mine` are the two
 * screens that are full-height workspaces rather than scrolling documents. Their
 * content — a rail of summary panels beside one main card — is built to fill the
 * window and scroll in its own regions, so the shell bounds itself to the
 * viewport (`h-dvh`, `overflow-hidden`), makes `<main>` the one flexible band,
 * and drops the marketing footer entirely — every pixel of height goes to the
 * workspace. Every other page is an ordinary document: it grows with its
 * content, scrolls the page, and keeps its footer.
 *
 * The two shapes are chosen here, by path, rather than baked into the shared
 * layout, so the full-height treatment stays confined to the workspaces and no
 * other console page changes. `usePathname` runs on the server for the first paint
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

  /*
   * The two workspaces, and only those two.
   *
   * `/listings` is the browse feed and `/listings/mine` is the practice's own
   * board; both are drawn as the reference dashboard — a rail of summary panels
   * beside one main card, filling the window with each region scrolling on its
   * own. Every other page is an ordinary document: it grows with its content,
   * scrolls the page, and keeps the marketing footer.
   *
   * The two shapes are chosen here, by path, rather than baked into the shared
   * layout, so the full-height treatment stays confined to the workspaces and no
   * other console page changes. `usePathname` runs on the server for the first
   * paint as well — client components are server-rendered — so the correct shape
   * is in the HTML from the start; no class is swapped in after hydration and
   * nothing shifts on arrival.
   *
   * An exact pair, so a sibling route cannot leak into it the way a
   * `startsWith("/listings")` would: the detail page under `/listings/mine/[id]`
   * is a document with its own back link and none of the rail.
   */
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
