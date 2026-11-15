"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useActiveSection } from "@/lib/hooks/use-active-section";

export interface SettingsNavItem {
  id: string;
  label: string;
}

/** The settings page's table of contents; the section in view is marked. */
export function SettingsNav({
  items,
  className,
}: {
  items: readonly SettingsNavItem[];
  className?: string;
}) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const active = useActiveSection(ids);

  return (
    <nav aria-label="Sections du profil" className={className}>
      <ul className="flex flex-col border-l border-border">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors",
                  current
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
