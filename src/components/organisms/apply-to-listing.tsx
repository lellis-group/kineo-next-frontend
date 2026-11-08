"use client";

/**
 * The apply section of a public listing detail page.
 *
 * The reader is already looking at the posting, so the flow is one button and
 * one optional sentence, not another page: the button opens the form, the
 * message travels with the application, and the confirmation stays where the
 * posting is, with the way out to « Mes candidatures » beside it.
 *
 * Eligibility is not re-decided here. The server page gates who sees this
 * section at all (signed in, profile created, not an installed-practice-only
 * profile), because the backend decides it against the same facts — a refused
 * apply is still reported in French through `applyErrorMessage`, as the honest
 * answer to a state that changed between render and submit.
 */

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import {
  APPLY_SUCCESS,
  applyErrorMessage,
  applyToListing,
} from "@/lib/applications";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/** Backend CreateApplicationDto — optional message, 1-2000 chars. */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * `closed` — the button, until opened; `open` — the form, until a settle;
 * `sent` — the confirmation, terminal for the session: the reader has applied
 * and nothing here un-applies.
 */
type ApplyState = "closed" | "open" | "sent";

export function ApplyToListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ApplyState>("closed");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    setError("");
    setSending(true);
    try {
      await applyToListing(listingId, trimmed || undefined);
      setState("sent");
    } catch (err) {
      if (!signInOnExpiredSession(err, router)) {
        setError(applyErrorMessage(err));
      }
    } finally {
      setSending(false);
    }
  }

  if (state === "sent") {
    return (
      <section
        aria-label="Candidature envoyée"
        className="border-t border-border pt-6"
      >
        <p className="text-sm font-bold">{APPLY_SUCCESS}</p>
        <p className="mt-2 text-sm text-muted">
          Vous pouvez suivre son état depuis vos candidatures.
        </p>
        <div className="mt-4">
          <Button href="/applications" variant="secondary">
            Voir mes candidatures
          </Button>
        </div>
      </section>
    );
  }

  if (state === "closed") {
    return (
      <section aria-label="Postuler" className="border-t border-border pt-6">
        <Button onClick={() => setState("open")}>Postuler</Button>
      </section>
    );
  }

  return (
    <section aria-label="Postuler" className="border-t border-border pt-6">
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="apply-message"
          className="flex items-baseline justify-between gap-4"
        >
          <span className="field-label">Message au cabinet (optionnel)</span>
          <span className="text-xs text-faint">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </label>
        <textarea
          id="apply-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Précisez vos disponibilités, votre expérience sur ce type de remplacement…"
          className="field-input mt-2 resize-none text-sm"
        />

        {error && (
          <InlineAlert as="p" tone="danger" className="mt-3">
            {error}
          </InlineAlert>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <PendingButton
            type="submit"
            pending={sending}
            idleLabel="Envoyer la candidature"
            pendingLabel="Envoi…"
          />
          <Button
            variant="ghost"
            disabled={sending}
            onClick={() => setState("closed")}
          >
            Annuler
          </Button>
        </div>
      </form>
    </section>
  );
}
