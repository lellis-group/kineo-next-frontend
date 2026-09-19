import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppHeaderLoader } from "@/components/organisms/app-header-loader";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteHeader } from "@/components/organisms/site-header";
import { publicNav } from "@/lib/navigation";

/** Shell for public and member pages: shared navbar + footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Server header streams in after the static shell (client hooks inside). */}
      <Suspense fallback={<SiteHeader links={publicNav} />}>
        <AppHeaderLoader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
