import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/atoms/card";
import {
  CheckIcon,
  FileTextIcon,
  StarIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { SectionHeading } from "@/components/atoms/section-heading";
import { ActivityItem } from "@/components/molecules/activity-item";
import type { ActivityEntry } from "@/lib/dashboard";

const ACTIVITY_ICONS: Record<
  ActivityEntry["icon"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  users: UsersIcon,
  check: CheckIcon,
  star: StarIcon,
  file: FileTextIcon,
};

export function ActivityFeed({
  items,
  title = "Activité récente",
  emptyMessage,
  seeAllHref,
}: {
  items: ActivityEntry[];
  title?: string;
  /** Message shown when there is no activity (onboarding). */
  emptyMessage?: string;
  seeAllHref?: string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading
        title={title}
        action={
          seeAllHref &&
          items.length > 0 && (
            <Link
              href={seeAllHref}
              className="text-sm text-muted transition-colors hover:text-primary"
            >
              Tout voir
            </Link>
          )
        }
      />

      {items.length === 0 ? (
        emptyMessage && (
          <p className="mt-5 text-sm leading-relaxed text-muted">
            {emptyMessage}
          </p>
        )
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((entry) => (
            <li key={entry.id}>
              <ActivityItem
                icon={ACTIVITY_ICONS[entry.icon]}
                timestamp={entry.timestamp}
                href={entry.href}
              >
                {entry.message.map((segment, index) =>
                  segment.bold ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static segments, stable order
                    <strong key={index} className="font-medium text-foreground">
                      {segment.text}
                    </strong>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static segments, stable order
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </ActivityItem>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
