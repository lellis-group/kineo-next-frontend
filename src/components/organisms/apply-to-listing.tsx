"use client";

/**
 * The apply section of a listing detail page: a button opening a short form,
 * then a confirmation in place. Who sees it is decided by the server page; a
 * refusal is reported through `applyErrorMessage`.
 */

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/atoms/button";
import { CountedTextarea } from "@/components/molecules/counted-textarea";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import {
  APPLY_SUCCESS,
  applyErrorMessage,
  applyToListing,
} from "@/lib/applications";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/** Backend CreateApplicationDto — optional message, 1-2000 chars. */
const MAX_MESSAGE_LENGTH = 2000;

/** `sent` is terminal: nothing here un-applies. */
type ApplyState = "closed" | "open" | "sent";

export function ApplyToListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ApplyState>("closed");
  const [draft, setDraft] = useState("");
  const {
    pending: sending,
    error,
    run,
  } = useAsyncSubmit((err) =>
    signInOnExpiredSession(err, router) ? null : applyErrorMessage(err),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    const sent = await run(() =>
      applyToListing(listingId, trimmed || undefined),
    );
    if (sent) setState("sent");
  }

  if (state === "sent") {
    return (
      <section
        aria-label="Candidature envoyée"
        className="border-t border-border pt-6"
      >
        <p className="text-sm font-medium">{APPLY_SUCCESS}</p>
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
        <CountedTextarea
          label="Message au cabinet (optionnel)"
          value={draft}
          onChange={setDraft}
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Précisez vos disponibilités, votre expérience sur ce type de remplacement…"
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
