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

/**
 * A link in the footer.
 *
 * One shape for every link, and it is the plainest one. It used to come in two
 * — pills on a wash for the legal cluster, bare text for the product list — so
 * the two groups sitting side by side read as two different kinds of thing, and
 * the pills read as the console's filter chips dropped into a footer. A quiet
 * line of text, washed to the brand cream on hover, is the whole vocabulary: the
 * hairline above the band and the colour under it are what make the group read
 * as a footer rather than as a row of buttons.
 *
 * `title` on the placeholders: « Tarifs » and friends point at `#` until the
 * page exists, and a link that silently does nothing reads as broken rather
 * than as pending.
 */
function FooterLink({ href, label }: { href: string; label: string }) {
  const pending = href === "#" ? "Bientôt disponible" : undefined;

  return (
    <Link
      href={href}
      title={pending}
      className="text-[0.8125rem] leading-tight whitespace-nowrap text-muted transition-colors hover:text-primary"
    >
      {label}
    </Link>
  );
}

/**
 * One group of links, under its own label.
 *
 * The label is small, muted and medium-weight — the treatment the console's
 * panels give the names of their figures (« Urgentes », « annonces ouvertes ») —
 * and quieter than the links it names, `text-faint` against their `text-muted`,
 * so the signpost is never mistaken for one more link that goes nowhere.
 *
 * Its links are one row that wraps. Two across (a grid) held the product list
 * to two lines but gave it a shape the legal group beside it did not have, and a
 * row of pills gave the legal group the mirror of that problem; one row each is
 * the single shape both groups share, and it is the one the rest of the site
 * uses whenever the same kind of thing repeats — the console's chips, the trust
 * bar's pills.
 */
function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h3 className="text-[0.6875rem] leading-tight font-medium text-faint">
        {title}
      </h3>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
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
 * The site footer, drawn in the band the page already speaks.
 *
 * One band — a hairline above, the page's own colour under — and two zones on
 * it from `sm` up: the brand on the left, the link groups on the right. No
 * separate bottom bar: the copyright sits under the tagline, in the shortest of
 * the zones, so the layout keeps the row height the brand column needs and no
 * more.
 *
 * The band is `bg-background` and not `bg-surface`, which is the change that
 * matters most. The footer is chrome, not a card: on the near-black surface it
 * sat directly under the `bg-surface` call-to-action band with only a hairline
 * between them, so the two merged into one black slab at the foot of every page
 * and the footer had no edge of its own. In the page's colour it is the header's
 * counterpart — a hairline and nothing else, at the other end of the document —
 * and the cream hairline under the CTA above it is what ends that band.
 *
 * Everything is drawn from the theme tokens (`--background`, `--primary`,
 * `--border`, `--muted`, `--faint`), so it follows any palette change without a
 * second edit.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div
        className={cn(
          SITE_SHELL,
          // Bouclé sur le même pas que le header et le contenu : les trois bandes
          // s'alignent sur les mêmes marges, et le footer n'est pas le seul endroit
          // où la page s'arrête.
          "flex flex-col gap-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-5 sm:pb-[calc(1.125rem+env(safe-area-inset-bottom))]",
          "sm:flex-row sm:items-start sm:justify-between sm:gap-10",
        )}
      >
        <div className="min-w-0">
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

          {/*
            One line, truncated: the tagline is a sentence and the column has
            room for a sentence, but a sentence that wraps is a line of height
            the footer does not owe anybody. The full text stays on `title`, so
            the truncation is a fit and not a cut.
          */}
          <p
            className="mt-2 max-w-md truncate text-sm leading-snug text-muted"
            title={footerContent.tagline}
          >
            {footerContent.tagline}
          </p>

          <p className="mt-1.5 text-[0.6875rem] text-faint">
            © {COPYRIGHT_YEAR} Kineo. Tous droits réservés.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:gap-10">
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
