import type {
  ProgressStep,
  ProgressStepState,
  ProgressTone,
} from "@/lib/applications";
import { cn } from "@/lib/cn";

/** A reached step's dot, per tone. */
const DONE_DOT: Record<ProgressTone, string> = {
  journey: "bg-primary",
  neutral: "bg-muted",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

/** The ring around the step the application is waiting on. */
const CURRENT_RING: Record<ProgressTone, string> = {
  journey: "border-primary ring-primary/20",
  neutral: "border-muted ring-muted/20",
  success: "border-success ring-success/20",
  danger: "border-danger ring-danger/20",
  warning: "border-warning ring-warning/20",
  info: "border-info ring-info/20",
};

const DONE_LABEL: Record<ProgressTone, string> = {
  journey: "text-foreground",
  neutral: "text-muted",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

const STATE_WORDS: Record<ProgressStepState, string> = {
  done: "fait",
  current: "en cours",
  pending: "à venir",
  skipped: "sans objet",
};

/** The segment leading into a step: drawn once the step is reached. */
function Segment({ reached }: { reached: boolean }) {
  return reached ? (
    <span className="h-px flex-1 bg-primary/45" />
  ) : (
    <span className="flex-1 border-t border-dashed border-border-strong" />
  );
}

function Dot({ step }: { step: ProgressStep }) {
  switch (step.state) {
    case "done":
      return (
        <span className={cn("size-3 rounded-full", DONE_DOT[step.tone])} />
      );
    case "current":
      return (
        <span
          className={cn(
            "size-3.5 rounded-full border-2 bg-background ring-4",
            CURRENT_RING[step.tone],
          )}
        />
      );
    case "pending":
      return (
        <span className="size-3 rounded-full border border-border-strong bg-background" />
      );
    case "skipped":
      return <span className="size-1.5 rounded-full bg-border-strong" />;
  }
}

/**
 * A journey drawn as dots on a line, one column per step, with its label and
 * date under it. The line into a step is solid once that step is reached.
 */
export function ProgressTrack({
  steps,
  className,
}: {
  steps: readonly ProgressStep[];
  className?: string;
}) {
  return (
    <ol
      aria-label="Progression de la candidature"
      className={cn("grid", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const reached = step.state === "done" || step.state === "current";
        const next = steps[index + 1];
        const nextReached = next?.state === "done" || next?.state === "current";
        return (
          <li key={step.id} className="flex min-w-0 flex-col items-center">
            <span aria-hidden="true" className="flex h-4 w-full items-center">
              {index === 0 ? (
                <span className="flex-1" />
              ) : (
                <Segment reached={reached} />
              )}
              <span className="grid w-4 shrink-0 place-items-center">
                <Dot step={step} />
              </span>
              {next ? (
                <Segment reached={nextReached} />
              ) : (
                <span className="flex-1" />
              )}
            </span>
            <span
              className={cn(
                "mt-2 max-w-full truncate px-1 text-2xs leading-tight",
                step.state === "done"
                  ? DONE_LABEL[step.tone]
                  : step.state === "current"
                    ? "text-foreground"
                    : "text-faint",
              )}
            >
              {step.label}
              <span className="sr-only"> ({STATE_WORDS[step.state]})</span>
            </span>
            <span className="mt-0.5 h-3 text-[0.625rem] leading-none text-faint tabular-nums">
              {step.date}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
