"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/atoms/avatar";
import { ChevronDownIcon, LogOutIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/**
 * The signed-in member's plate (avatar, name, role) opening the account menu.
 * Closes on Escape, on a click outside, and after a choice.
 */
export function UserMenu({
  name,
  subtitle,
  onSignOut,
}: {
  name: string;
  subtitle: string;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const dismiss = () => setOpen(false);

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };

    // Return focus to the trigger, or the next Tab starts from the top.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismiss();
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex cursor-pointer items-center gap-2.5 rounded-full border border-border py-1 pr-2.5 pl-1 transition-colors hover:border-border-strong hover:bg-surface-hover"
      >
        <Avatar name={name} className="h-8 w-8 text-xs" />

        {/* The name and role appear from `lg`, where there's room for them. */}
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block truncate text-sm leading-tight font-medium text-foreground">
            {name}
          </span>
          <span className="block truncate text-2xs leading-tight text-muted">
            {subtitle}
          </span>
        </span>

        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Compte"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-60 overflow-hidden rounded-card border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          <div className="border-b border-border px-3 pt-2 pb-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {name}
            </p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>

          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center rounded-control px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:outline-none"
          >
            Mon profil
          </Link>

          {onSignOut && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:outline-none"
            >
              <LogOutIcon className="size-4" />
              Se déconnecter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
