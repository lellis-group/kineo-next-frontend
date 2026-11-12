import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppHeaderLoader } from "@/components/organisms/app-header-loader";
import { HeaderSkeleton } from "@/components/organisms/header-skeleton";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteShell } from "@/components/templates/site-shell";

/**
 * The shared `(site)` chrome. `SiteShell` reads `usePathname()`, so it sits in
 * a `<Suspense>` to keep static pages prerenderable; the fallback reserves the
 * default shell's geometry.
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
