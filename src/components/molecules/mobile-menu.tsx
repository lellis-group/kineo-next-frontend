"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, LogOutIcon, MenuIcon } from "@/components/atoms/icons";
import { HeaderNav } from "@/components/molecules/header-nav";
import { cn } from "@/lib/cn";
import type { UserSummary } from "@/lib/dashboard";
import type { HeaderLink } from "@/lib/navigation";

export interface MobileMenuProps {
  links: HeaderLink[];
  activeHref?: string;
  /** Only present in the authenticated area. */
  user?: UserSummary;
  /** Sign-out callback (injected by AppHeader). */
  onSignOut?: () => void;
  /**
   * Current route path, injected by AppHeader. Read as a plain prop instead
   * of `usePathname()` so this component stays safe inside a prerendered
   * Suspense fallback (SiteHeader renders as the shell's fallback).
   */
  pathname?: string;
}

/**
 * Mobile navigation menu (< lg): animated dropdown panel with auth actions.
 *
 * Closes on route change, Escape, or outside tap. Focus moves into the panel
 * on open and returns to the trigger on close; the closed panel is `inert`
 * so it stays out of the tab order and screen-reader tree.
 */
export function MobileMenu({
  links,
  activeHref,
  user,
  onSignOut,
  pathname,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when the active route changes (back/forward, programmatic push).
  // `pathname` is an injected prop (see the prop docs) — this effect only
  // runs when the route actually changes.
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // Close on Escape + return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close on outside tap (no full-screen backdrop: the sticky header's
  // backdrop-filter would contain a `fixed` overlay to the header box).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="relative self-stretch lg:hidden">
      <div className="flex h-full items-center">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 active:scale-95",
            open
              ? "border-primary/50 text-foreground"
              : "border-border text-foreground/80",
          )}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        ref={panelRef}
        id={menuId}
        role="dialog"
        aria-label="Menu mobile"
        tabIndex={-1}
        inert={!open}
        className={cn(
          "absolute top-[calc(100%+0.5rem)] right-0 z-50 max-h-[70dvh] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-2xl shadow-black/50 outline-none transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <HeaderNav
          links={links}
          activeHref={activeHref}
          orientation="vertical"
          onNavigate={() => setOpen(false)}
        />

        <div className="my-2 border-t border-border" />

        {user ? (
          onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <LogOutIcon />
              Se déconnecter
            </button>
          )
        ) : (
          <div className="flex flex-col gap-2 p-1">
            <Link
              href="/signin"
              className="flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
