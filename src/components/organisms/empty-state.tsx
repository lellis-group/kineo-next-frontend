import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon } from "@/components/atoms/icons";

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
  return (
    <Card className="mt-8 flex flex-col items-center p-8 text-center sm:p-10">
      <div className="mb-4 rounded-full bg-primary/10 p-4">{icon}</div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {actionLabel && (actionHref || onAction) && (
        <Button
          href={actionHref}
          onClick={onAction}
          className="mt-6"
          type="button"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
