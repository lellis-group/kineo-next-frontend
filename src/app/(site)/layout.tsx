import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppHeaderLoader } from "@/components/organisms/app-header-loader";
import { HeaderSkeleton } from "@/components/organisms/header-skeleton";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteShell } from "@/components/templates/site-shell";

/**
 * The shared `(site)` chrome: header, body, footer.
 *
 * A server component, as it was. The shell it hands off to (`SiteShell`) is a
 * client component — it reads `usePathname()` to pick the layout shape — so it
 * sits inside a `<Suspense>` boundary: that dynamic hook is only available at
 * runtime, and without the boundary it would block the prerender of every
 * static page under this layout (`/`, `/privacy`, `/terms`). The fallback
 * reserves the default shell's geometry (header placeholder, flexible body,
 * footer) so nothing shifts when the real shell streams in.
 *
 * Only `/listings` opts out of the scrolling-document shape and into the
 * full-height workspace; that decision lives in `SiteShell`, so every other
 * page under this layout keeps exactly the behaviour it had.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
          <HeaderSkeleton />
          <main className="flex-1" />
          <SiteFooter />
        </div>
      }
    >
      <SiteShell
        header={
          <Suspense fallback={<HeaderSkeleton />}>
            <AppHeaderLoader />
          </Suspense>
        }
        footer={<SiteFooter />}
      >
        {children}
      </SiteShell>
    </Suspense>
  );
}
