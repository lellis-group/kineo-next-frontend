import Link from "next/link";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { footerContent } from "@/lib/marketing";

/**
 * Static build-time constant: Next.js prerenders this footer, so a runtime
 * `new Date()` would block the build ("unstable value during prerendering").
 * Bump it on January 1st of each year.
 */
const COPYRIGHT_YEAR = 2026;

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
      <ul className="space-y-0.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              title={link.href === "#" ? "Bientôt disponible" : undefined}
              className="inline-block py-1 text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 sm:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-12">
          <div className="max-w-sm sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="Kineo — Accueil"
              className="inline-flex rounded-lg"
            >
              <KineoLogo />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {footerContent.description}
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

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-4 text-center text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {COPYRIGHT_YEAR} Kineo. Tous droits réservés.</p>
          <p>{footerContent.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
