import Link from "next/link";
import { BellIcon, LogOutIcon } from "@/components/atoms/icons";
import { KineoLogo } from "@/components/atoms/kineo-logo";
import { HeaderNav } from "@/components/molecules/header-nav";
import { MobileMenu } from "@/components/molecules/mobile-menu";
import { UserIdentity } from "@/components/molecules/user-identity";
import type { UserSummary } from "@/lib/dashboard";
import type { HeaderLink } from "@/lib/navigation";

function NotificationsButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground/80 transition-colors hover:border-primary/50 hover:text-foreground xl:flex"
    >
      <BellIcon />
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
      <div className="mx-auto flex h-[calc(4rem+env(safe-area-inset-top))] w-full max-w-360 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] sm:h-[calc(4.75rem+env(safe-area-inset-top))] sm:gap-6 sm:px-8 lg:px-10">
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
              <NotificationsButton />
              <UserIdentity
                name={user.name}
                subtitle={user.subtitle}
                showText={false}
                href="/profile"
              />

              <button
                type="button"
                onClick={onSignOut}
                aria-label="Se déconnecter"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <LogOutIcon />
                <span className="hidden xl:inline">Se déconnecter</span>
              </button>
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
