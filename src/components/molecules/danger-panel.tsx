"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/atoms/card";
import { AlertIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/**
 * The panel used to warn before something irreversible — the three screens that
 * need it (closing a listing, withdrawing an application, deleting an account)
 * were carrying byte-identical danger chrome, down to the icon-chip classes.
 *
 * `title` is optional because one caller uses the shell purely as a danger
 * notice, with no heading of its own. `headingLevel` is a prop because the panel
 * is used both as a page section and inside a card, and getting it wrong breaks
 * the document outline.
 */
export function DangerPanel({
  icon,
  title,
  children,
  headingLevel: Heading = "h3",
  className,
}: {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <Card className={cn("border-danger/30 bg-danger/5 p-5 sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger"
        >
          {icon ?? <AlertIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          {title && (
            <Heading className="text-base font-bold text-danger">
              {title}
            </Heading>
          )}
          {children}
        </div>
      </div>
    </Card>
  );
}
