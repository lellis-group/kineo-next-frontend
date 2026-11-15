import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import type { NextReplacement } from "@/lib/dashboard";

/**
 * The home's one headline figure: the next period a replacement is needed
 * for, and the way to its posting. The counts live in the rail.
 */
export function NextReplacementPanel({ next }: { next: NextReplacement }) {
  return (
    <Panel
      title="Prochain remplacement"
      action={
        next.href && (
          <Link
            href={next.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Voir l&apos;annonce
            <ArrowRightIcon className="size-3.5" />
          </Link>
        )
      }
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
        >
          <CalendarIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl leading-tight font-normal tracking-tight text-foreground sm:text-3xl">
            {next.period ?? "Aucun"}
          </p>
          <p className="mt-1 truncate text-sm text-muted">
            {next.title ? (
              <>
                <span className="text-foreground">{next.title}</span> ·{" "}
                {next.label.toLowerCase()}
              </>
            ) : (
              next.label
            )}
          </p>
        </div>
      </div>
    </Panel>
  );
}
