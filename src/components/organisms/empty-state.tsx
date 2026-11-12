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
  className?: string;
  /** For an action that is not a link, e.g. clearing filters. */
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
