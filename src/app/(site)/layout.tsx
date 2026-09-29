import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppHeaderLoader } from "@/components/organisms/app-header-loader";
import { HeaderSkeleton } from "@/components/organisms/header-skeleton";
import { SiteFooter } from "@/components/organisms/site-footer";

/** Shell for public and member pages: shared navbar + footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* The server header streams in after the static shell (client hooks
          inside). The fallback is a geometry-matched placeholder rather than
          the anonymous header: rendering the real signed-out bar here would
          show "Se connecter" to a member, then repaint the whole navbar. */}
      <Suspense fallback={<HeaderSkeleton />}>
        <AppHeaderLoader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
