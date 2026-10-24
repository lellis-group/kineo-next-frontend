import Link from "next/link";
import type { ReactNode } from "react";
import { BellIcon, SearchIcon } from "@/components/atoms/icons";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { HeaderNav } from "@/components/molecules/header-nav";
import { MobileMenu } from "@/components/molecules/mobile-menu";
import { UserMenu } from "@/components/molecules/user-menu";
import { cn } from "@/lib/cn";
import type { UserSummary } from "@/lib/dashboard";
import { HEADER_HEIGHT, HEADER_HEIGHT_SM, SITE_SHELL } from "@/lib/layout";
import type { HeaderLink } from "@/lib/navigation";

/**
 * The two icon buttons the reference puts between the nav and the account plate.
 *
 * Round, outlined and out of the way at every width above `lg` — the same
 * geometry as the plate they sit beside. The notifications button is still the
 * placeholder it has always been (nothing in the product emits one yet), and
 * `hidden` below `lg` because at that width the plate is already avatar-only and
 * a row of three icon buttons ahead of the mobile menu is more chrome than the
 * bar can carry.
 */
function HeaderIconButton({
  href,
  label,
  children,
}: {
  /** Omitted for a button with no destination yet. */
  href?: string;
  label: string;
  children: ReactNode;
}) {
  const className =
    "hidden size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground lg:flex";

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} className={className}>
      {children}
    </button>
  );
}

export function SiteHeader({
  links,
  activeHref,
  user,
  onSignOut,
  pathname,
}: {
  links: HeaderLink[];
  activeHref?: string;
  /** Only present in the authenticated area. */
  user?: UserSummary;
  /** Sign-out callback (injected by AppHeader). */
  onSignOut?: () => void;
  /** Current route path — forwarded to the mobile menu (see MobileMenu props). */
  pathname?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div
        className={cn(
          SITE_SHELL,
          `${HEADER_HEIGHT} items-center justify-between gap-2 pt-[env(safe-area-inset-top)] ${HEADER_HEIGHT_SM} sm:gap-6`,
        )}
      >
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Link href="/" aria-label="Kineo — Accueil">
            <KineoLogo />
          </Link>

          <HeaderNav
            links={links}
            activeHref={activeHref}
            orientation="horizontal"
          />
        </div>

        <div className="flex self-stretch items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* To the browse feed, which is where the product's only search
                  lives — a city field over a map, not a site-wide index. */}
              <HeaderIconButton href="/listings" label="Rechercher">
                <SearchIcon className="size-4" />
              </HeaderIconButton>

              <HeaderIconButton label="Notifications">
                <BellIcon className="size-4" />
              </HeaderIconButton>

              {/*
                Name, role and every account action behind one plate. This is
                where the separate sign-out button used to sit: the reference's
                bar carries an avatar, a name, a role and a chevron, and no
                other control — which is only possible if leaving is one click
                away rather than one row across.
              */}
              <UserMenu
                name={user.name}
                subtitle={user.subtitle}
                onSignOut={onSignOut}
              />
            </>
          ) : (
            <>
              <span className="hidden items-center gap-2 border-r border-border pr-4 sm:flex">
                <Link
                  href="/signin"
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  Se connecter
                </Link>
              </span>

              <Link
                href="/signup"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover min-[360px]:px-3 min-[360px]:text-[13px] sm:px-4 sm:py-2 sm:text-sm"
              >
                Créer un compte
              </Link>
            </>
          )}

          {/* Mobile menu (animated dropdown with auth actions) */}
          <MobileMenu
            links={links}
            activeHref={activeHref}
            user={user}
            onSignOut={onSignOut}
            pathname={pathname}
          />
        </div>
      </div>
    </header>
  );
}
