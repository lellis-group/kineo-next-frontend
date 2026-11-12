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
 * The shell every auth and erasure screen is built on. The heading is exposed
 * as a focusable ref, so a caller can move focus to it when the content is
 * swapped.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  headingRef,
}: AuthCardProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      {/* `my-auto`: centred, yet scrollable when taller than the viewport. */}
      <div className="my-auto w-full max-w-110 rounded-card border border-border bg-surface px-5 py-7 shadow-2xl shadow-black/50 sm:px-9 sm:py-10">
        <div className="mb-8 flex flex-col items-center gap-6 text-center sm:mb-9 sm:gap-8">
          <KineoLogo />

          <div className="space-y-2">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-[1.7rem] leading-tight font-medium tracking-tight focus:outline-none"
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
