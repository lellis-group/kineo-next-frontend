import type { ReactNode } from "react";
import { BackLink } from "@/components/molecules/back-link";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";

/**
 * Shell for the long-form legal documents, on the site's geometry like the
 * console pages: the back link, the title, then the text in a reading
 * column. No `<main>` and no header/footer: the `(site)` layout provides them.
 */
export function LegalDocument({
  title,
  updatedAt,
  children,
  backHref,
  backLabel,
  wide = false,
}: {
  title: string;
  /** Shown under the title as « Dernière mise à jour : … ». */
  updatedAt: string;
  children: ReactNode;
  backHref: string;
  backLabel: string;
  /** The privacy policy is wider: it has a section sidebar beside the prose. */
  wide?: boolean;
}) {
  return (
    <div className={cn(SITE_SHELL, "py-8 sm:py-10")}>
      <div className={wide ? "max-w-6xl" : "max-w-3xl"}>
        <BackLink href={backHref}>{backLabel}</BackLink>

        <header className="mt-6 mb-10 border-b border-border pb-8">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Dernière mise à jour : {updatedAt}
          </p>
        </header>

        <article>{children}</article>
      </div>
    </div>
  );
}
