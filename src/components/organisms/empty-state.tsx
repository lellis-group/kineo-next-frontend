import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon } from "@/components/atoms/icons";
import { StatusBlock } from "@/components/atoms/status-block";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon = <FileTextIcon className="h-8 w-8 text-primary" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /**
   * Overrides for the box itself.
   *
   * The browse panel hands this to an empty state it has to keep the same size
   * as a full list of rows: it passes `mt-0 w-full` so the card can be centred in
   * a fixed-height box rather than carrying its own margin into it. `Card`
   * merges through `cn`, so `mt-0` displaces the `mt-8` above rather than
   * competing with it.
   */
  className?: string;
  /**
   * Action handler for an action that is not a link — clearing filters, for one.
   *
   * Beside `actionHref` rather than replacing it: `Button` renders as a link when
   * given an `href` and as a button when given an `onClick`, so an empty state can
   * offer either without the component knowing which kind of action it is.
   */
  onAction?: () => void;
}) {
  const showAction = Boolean(actionLabel && (actionHref || onAction));

  return (
    <Card className={cn("mt-8 p-8 sm:p-10", className)}>
      <StatusBlock
        icon={icon}
        title={title}
        description={description}
        action={
          showAction ? (
            <Button href={actionHref} onClick={onAction} type="button">
              {actionLabel}
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}
