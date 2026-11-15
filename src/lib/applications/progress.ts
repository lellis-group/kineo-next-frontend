/**
 * An application's journey as three steps — sent, viewed by the practice,
 * decided — read from what the row records. Nothing is inferred that the row
 * doesn't say: a decision without a `viewedAt` leaves « Consultée » skipped,
 * not ticked.
 */

import { formatDayMonth } from "../format";
import type { ApplicationStatus } from "../types/api";
import type { Tone } from "../ui-tokens";
import { isAwaitingDecision } from "./adapters";
import type { ApplicationEntry } from "./contracts";

/**
 * - `done`: it happened.
 * - `current`: what the application is waiting on now.
 * - `pending`: still ahead.
 * - `skipped`: the journey ended without it.
 */
export type ProgressStepState = "done" | "current" | "pending" | "skipped";

/**
 * A step's colour: `journey` is the cream of the way so far; the tones are
 * the outcome's (`neutral` greys out a withdrawal).
 */
export type ProgressTone = "journey" | Tone;

export interface ProgressStep {
  id: "sent" | "viewed" | "decision";
  label: string;
  state: ProgressStepState;
  tone: ProgressTone;
  /** « 15 sept. », when the row dates the step. */
  date?: string;
}

/** What a rejection is called on the track, per situation. */
const REJECTION_LABELS = {
  REFUSED: "Non retenue",
  PASSED_OVER: "Poste pourvu",
  POSTING_ENDED: "Annonce close",
} as const;

const DECIDED: Record<
  Exclude<ApplicationStatus, "PENDING" | "SHORTLISTED">,
  { label: string; tone: Tone }
> = {
  ACCEPTED: { label: "Acceptée", tone: "success" },
  REJECTED: { label: "Non retenue", tone: "danger" },
  WITHDRAWN: { label: "Retirée", tone: "neutral" },
};

type ProgressInput = Pick<
  ApplicationEntry,
  | "status"
  | "createdAt"
  | "viewed"
  | "viewedAt"
  | "respondedAt"
  | "rejectionBucket"
>;

export function applicationProgress(entry: ProgressInput): ProgressStep[] {
  const open = isAwaitingDecision(entry.status);
  const dated = (iso?: string) => (iso ? formatDayMonth(iso) : undefined);

  const sent: ProgressStep = {
    id: "sent",
    label: "Envoyée",
    state: "done",
    tone: "journey",
    date: formatDayMonth(entry.createdAt),
  };

  const viewed: ProgressStep = {
    id: "viewed",
    // Waiting on the practice to open it: say so, don't claim it.
    label: entry.viewed || !open ? "Consultée" : "Pas encore lue",
    state: entry.viewed ? "done" : open ? "current" : "skipped",
    tone: "journey",
    date: dated(entry.viewedAt),
  };

  return [sent, viewed, decisionStep(entry, open, dated(entry.respondedAt))];
}

function decisionStep(
  entry: ProgressInput,
  open: boolean,
  date: string | undefined,
): ProgressStep {
  if (open) {
    const shortlisted = entry.status === "SHORTLISTED";
    return {
      id: "decision",
      label: shortlisted ? "Présélectionnée" : "Décision",
      // Waiting on the practice only once it has looked.
      state: shortlisted || entry.viewed ? "current" : "pending",
      tone: shortlisted ? "info" : "journey",
    };
  }

  const decided = DECIDED[entry.status as keyof typeof DECIDED];
  const label =
    entry.status === "REJECTED" && entry.rejectionBucket
      ? REJECTION_LABELS[entry.rejectionBucket]
      : decided.label;

  return { id: "decision", label, state: "done", tone: decided.tone, date };
}
