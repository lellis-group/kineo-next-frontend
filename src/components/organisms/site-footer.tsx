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
 * Three renderings, because the reference draws three different shapes for a
 * link depending on how many of them there are and what they are for: the
 * dashboard's own controls are pills on a wash, and its text is plain with a
 * colour change on hover. Legal links are the utility cluster — four of them,
 * names that carry no hierarchy — so they take the pill. Product links are a
 * short list and take the text.
 *
 * `title` on the placeholders: « Tarifs » and friends point at `#` until the
 * page exists, and a link that silently does nothing reads as broken rather
 * than as pending.
 */
function FooterLink({
  href,
  label,
  pill,
}: {
  href: string;
  label: string;
  pill?: boolean;
}) {
  const pending = href === "#" ? "Bientôt disponible" : undefined;

  return (
    <Link
      href={href}
      title={pending}
      className={
        pill
          ? "inline-flex items-center rounded-full bg-white/[0.04] px-2.5 py-1 text-[0.8125rem] text-muted transition-colors hover:bg-white/[0.07] hover:text-primary"
          : "inline-block text-[0.8125rem] text-muted transition-colors hover:text-primary"
      }
    >
      {label}
    </Link>
  );
}

/**
 * One group of links, under its own label.
 *
 * The label is small, muted and medium-weight — the treatment the console's
 * panels give the names of their figures (« Urgentes », « annonces ouvertes »),
 * and the reference's own: its chart labels are set quiet rather than shouted,
 * because a group heading in a footer is a signpost and not a headline. It used
 * to be bold and upper-case, which made two columns of footer text into two
 * columns of headings.
 */
function FooterLinkGroup({
  title,
  links,
  variant,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
  /** `pills` for the utility cluster, `list` for the short two-column one. */
  variant: "pills" | "list";
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h3 className="text-[0.6875rem] leading-tight font-medium text-muted">
        {title}
      </h3>

      {variant === "pills" ? (
        /*
          One line, wrapping: four short names in pills are one row of chrome,
          where four stacked lines were four rows of it — and the pills are what
          the reference puts in a row whenever the same kind of link repeats.
        */
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {links.map((link) => (
            <li key={`${title}-${link.label}`}>
              <FooterLink href={link.href} label={link.label} pill />
            </li>
          ))}
        </ul>
      ) : (
        /*
          Two columns, because a list of four that runs down the screen costs
          twice the width of the group beside it and four lines of height. Two
          across is the shape that fits the row instead of setting its height.
        */
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {links.map((link) => (
            <li key={`${title}-${link.label}`}>
              <FooterLink href={link.href} label={link.label} />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

/**
 * The site footer, drawn in the console's own language.
 *
 * One band — a hairline above, the near-black surface under — and two zones on
 * it from `sm` up: the brand on the left, the link groups on the right. No
 * separate bottom bar: the copyright sits under the tagline, in the shortest of
 * the zones, so the layout keeps the row height the brand column needs and no
 * more.
 *
 * It does not grow it either. The tallest column used to be the link lists, at
 * four rows each; the products are two across and the legal ones are one row of
 * pills, so the brand column is now what sets the height, and the footer is
 * thinner than it was while carrying every link it carried before.
 *
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

        <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
          <FooterLinkGroup
            title="Produit"
            links={footerContent.productLinks}
            variant="list"
          />
          <FooterLinkGroup
            title="Légal & Contact"
            links={footerContent.legalLinks}
            variant="pills"
          />
        </div>
      </div>
    </footer>
  );
}
