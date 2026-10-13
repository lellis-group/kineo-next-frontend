import Link from "next/link";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import { footerContent } from "@/lib/marketing";

/**
 * Static build-time constant: Next.js prerenders this footer, so a runtime
 * `new Date()` would block the build ("unstable value during prerendering").
 * Bump it on January 1st of each year.
 */
const COPYRIGHT_YEAR = 2026;

/**
 * The beta pill beside the logo.
 *
 * The site already describes itself as « Gratuit en bêta » (the marketing trust
 * bar), so this is a claim the rest of the product makes — drawn in the brand
 * cream on a cream wash, the same treatment as the numbered markers on the
 * legal pages, so it reads as one system rather than a footer-only flourish.
 */
function BetaBadge() {
  return (
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-primary">
      Bêta
    </span>
  );
}

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-2 text-xs font-bold tracking-widest text-foreground/70 uppercase">
        {title}
      </h3>
      <ul className="space-y-0">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              title={link.href === "#" ? "Bientôt disponible" : undefined}
              className="inline-block py-0.5 text-sm text-muted transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The site footer, drawn in the product's own language.
 *
 * Compact on purpose — it sits under every console screen and the working ones
 * are full-height. One row: the brand column (logo, beta pill, tagline,
 * copyright) beside the two link columns, no separate bottom bar to spend a
 * second row of height on. The cream beta pill ties it to the marketing trust
 * bar and the hover tint matches the accent every link on the site uses.
 * Everything is drawn from the theme tokens (`--surface`, `--primary`,
 * `--border`, `--muted`), so it follows any palette change without a second
 * edit.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div
        className={cn(
          SITE_SHELL,
          "flex flex-col pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-5 sm:pb-[calc(1.125rem+env(safe-area-inset-bottom))]",
        )}
      >
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-[minmax(0,1.5fr)_auto_auto] md:gap-10">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                aria-label="Kineo — Accueil"
                className="inline-flex rounded-lg"
              >
                <KineoLogo />
              </Link>
              <BetaBadge />
            </div>
            <p className="mt-2 max-w-xs text-sm leading-snug text-muted">
              {footerContent.tagline}
            </p>
            {/*
              The copyright sits under the tagline rather than in a separate
              bottom bar. It is one short line, and the brand column is the
              shortest of the three — so it drops into the space the link
              columns already leave, adding no height and removing the whole
              second row (its margin, border and padding) the old bottom bar
              cost. The legal links it used to duplicate already live in the
              « Légal & Contact » column, so nothing is lost.
            */}
            <p className="mt-3 text-xs text-faint">
              © {COPYRIGHT_YEAR} Kineo. Tous droits réservés.
            </p>
          </div>

          <FooterLinkColumn
            title="Produit"
            links={footerContent.productLinks}
          />
          <FooterLinkColumn
            title="Légal & Contact"
            links={footerContent.legalLinks}
          />
        </div>
      </div>
    </footer>
  );
}
