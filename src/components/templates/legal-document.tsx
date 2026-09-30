import Link from "next/link";
import type { ReactNode } from "react";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { PROSE_CONTAINER } from "@/lib/layout";

/**
 * Shell for the long-form legal documents.
 *
 * Two things this fixes, both of which every legal page was doing its own way:
 *
 * - it renders no `<main>`. The `(site)` layout already provides the page's
 *   single `main`, and a second one inside it is invalid HTML and gives assistive
 *   technology two landmarks to choose between.
 * - it renders no site header or footer. The layout has both; the pages were
 *   repeating the logo and a "back" link on top, so a reader saw two navbars.
 */
export function LegalDocument({
  title,
  updatedAt,
  children,
  backHref,
  backLabel,
  containerClassName = PROSE_CONTAINER,
}: {
  title: string;
  /** Shown under the title as « Dernière mise à jour : … ». */
  updatedAt: string;
  children: ReactNode;
  backHref: string;
  backLabel: string;
  /** The privacy policy is wider: it has a section sidebar beside the prose. */
  containerClassName?: string;
}) {
  return (
    <div className={containerClassName}>
      <header className="mb-10 flex flex-col items-center gap-6 text-center">
        <Link href="/" aria-label="Kineo — Accueil">
          <KineoLogo />
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted">
            Dernière mise à jour : {updatedAt}
          </p>
        </div>
      </header>

      <article>{children}</article>

      <div className="mt-14 border-t border-border pt-6 text-center">
        <Link
          href={backHref}
          className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
