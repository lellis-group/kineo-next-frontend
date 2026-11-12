import Link from "next/link";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import { footerContent } from "@/lib/marketing";

/**
 * Static: Next.js prerenders this footer, and a runtime `new Date()` would
 * block the build. Bump it each January.
 */
const COPYRIGHT_YEAR = 2026;

function BetaBadge() {
  return (
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-medium tracking-wide text-primary">
      Bêta
    </span>
  );
}

/** `title` on placeholder (`#`) links, so they read as pending, not broken. */
function FooterLink({ href, label }: { href: string; label: string }) {
  const pending = href === "#" ? "Bientôt disponible" : undefined;

  return (
    <Link
      href={href}
      title={pending}
      className="text-control leading-tight whitespace-nowrap text-muted transition-colors hover:text-primary"
    >
      {label}
    </Link>
  );
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <nav aria-label={title} className="min-w-40">
      <h3 className="text-2xs leading-tight font-medium text-faint">{title}</h3>

      <ul className="mt-2 flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <FooterLink href={link.href} label={link.label} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The site footer. `bg-background` rather than `bg-surface`, so it doesn't
 * merge with the call-to-action band above it.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div
        className={cn(
          SITE_SHELL,
          "flex flex-col gap-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-5 sm:pb-[calc(1.125rem+env(safe-area-inset-bottom))]",
          "sm:flex-row sm:items-start sm:justify-between sm:gap-10",
        )}
      >
        {/* Only the brand gives way in a row; the link columns keep their width. */}
        <div className="min-w-0 sm:flex-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              aria-label="Kineo — Accueil"
              className="inline-flex rounded-control"
            >
              <KineoLogo />
            </Link>
            <BetaBadge />
          </div>

          <p
            className="mt-2 max-w-md truncate text-sm leading-snug text-muted"
            title={footerContent.tagline}
          >
            {footerContent.tagline}
          </p>

          <p className="mt-1.5 text-2xs text-faint">
            © {COPYRIGHT_YEAR} Kineo. Tous droits réservés.
          </p>
        </div>

        <div className="flex flex-col gap-5 sm:shrink-0 sm:flex-row sm:gap-8 lg:gap-12">
          <FooterLinkGroup title="Produit" links={footerContent.productLinks} />
          <FooterLinkGroup
            title="Légal & Contact"
            links={footerContent.legalLinks}
          />
        </div>
      </div>
    </footer>
  );
}
