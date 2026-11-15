import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon } from "@/components/atoms/icons";
import { StatusBlock } from "@/components/atoms/status-block";
import { cn } from "@/lib/cn";

/** A card that says there is nothing to show, with an optional way out. */
export function EmptyState({
  icon = <FileTextIcon className="h-8 w-8 text-primary" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  /** Fills a flex parent (a panel body) instead of sitting in the flow. */
  fill = false,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** For an action that is not a link, e.g. clearing filters. */
  onAction?: () => void;
  fill?: boolean;
  className?: string;
}) {
  const showAction = Boolean(actionLabel && (actionHref || onAction));

  const card = (
    <Card
      className={cn("p-8 sm:p-10", fill ? "mt-0 w-full" : "mt-8", className)}
    >
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

  if (!fill) return card;

  return <div className="flex flex-1 items-center">{card}</div>;
}
