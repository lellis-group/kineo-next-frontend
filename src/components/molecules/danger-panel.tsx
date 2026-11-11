import type { ReactNode } from "react";
import { Card } from "@/components/atoms/card";
import { AlertIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/**
 * The panel that warns before something irreversible — one danger chrome, down
 * to the icon-chip classes, for the three screens that need it (closing a
 * listing, withdrawing an application, deleting an account).
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
      {/*
        On a phone the icon and the title share the first line and the body
        runs the card's full width under them: kept in the icon's column, the
        body lost a fifth of a 375px screen to the icon's gutter and read ten
        words a line. From `sm` the body sits beside the icon again. With no
        title there is nothing to share the line with, so the body stays in
        the second column at every size.
      */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-danger/15 text-danger sm:row-span-2"
        >
          {icon ?? <AlertIcon className="h-5 w-5" />}
        </span>
        {title && (
          <Heading className="min-w-0 text-base font-medium text-danger">
            {title}
          </Heading>
        )}
        <div
          className={cn(
            "min-w-0",
            title && "col-span-2 mt-2 sm:col-span-1 sm:col-start-2 sm:mt-0",
          )}
        >
          {children}
        </div>
      </div>
    </Card>
  );
}
