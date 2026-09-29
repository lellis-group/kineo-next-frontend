import type { ReactNode } from "react";
import { KineoLogo } from "@/components/atoms/kineo-logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      {/* my-auto: vertical centering that stays scrollable when the card
          exceeds the viewport (landscape, open keyboard) */}
      <div className="my-auto w-full max-w-110 rounded-2xl border border-border bg-surface px-5 py-7 shadow-2xl shadow-black/50 sm:px-9 sm:py-10">
        <div className="mb-8 flex flex-col items-center gap-6 text-center sm:mb-9 sm:gap-8">
          <KineoLogo />

          <div className="space-y-2">
            {/* `tabIndex` + the shared outline is what lets a screen reader
                or a keyboard user be moved here when the card content is
                swapped underneath them. The erasure flow replaces the whole
                card several times over. */}
            <h1
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
