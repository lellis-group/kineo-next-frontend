import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon } from "@/components/atoms/icons";
import { StatusBlock } from "@/components/atoms/status-block";

export function EmptyState({
  icon = <FileTextIcon className="h-8 w-8 text-primary" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
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
    <Card className="mt-8 p-8 sm:p-10">
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
