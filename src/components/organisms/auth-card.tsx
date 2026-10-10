"use client";

import type { ReactNode, Ref } from "react";
import { KineoLogo } from "@/components/atoms/kineo-logo";

export interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Focused when the card's content is swapped — see the note below. */
  headingRef?: Ref<HTMLHeadingElement>;
}

/**
 * The shell every auth and erasure screen is built on.
 *
 * The heading is exposed as a ref so a caller can move focus onto it when the
 * card's content is swapped underneath the reader — the erasure flow replaces
 * the whole card several times over, and without that a keyboard user is left
 * tabbing back through whatever was on the page before. The heading is the right
 * target: it names what the screen now is, and focusing the surrounding wrapper
 * instead would put a focus stop on a non-interactive box. `tabIndex` therefore
 * lives here rather than on the wrapper.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  headingRef,
}: AuthCardProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      {/* my-auto: vertical centering that stays scrollable when the card
          exceeds the viewport (landscape, open keyboard) */}
      <div className="my-auto w-full max-w-110 rounded-2xl border border-border bg-surface px-5 py-7 shadow-2xl shadow-black/50 sm:px-9 sm:py-10">
        <div className="mb-8 flex flex-col items-center gap-6 text-center sm:mb-9 sm:gap-8">
          <KineoLogo />

          <div className="space-y-2">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-[1.7rem] leading-tight font-bold tracking-tight focus:outline-none"
            >
              {title}
            </h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
