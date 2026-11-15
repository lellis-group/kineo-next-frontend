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
import { FormActions } from "@/components/molecules/form-actions";
import { InlineAlert } from "@/components/molecules/inline-alert";
import {
  APPLY_SUCCESS,
  applyErrorMessage,
  applyToListing,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PLACEHOLDER,
} from "@/lib/applications";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import { signInOnExpiredSession } from "@/lib/session-redirect";

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
      <section aria-label="Candidature envoyée">
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
      <section aria-label="Postuler">
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Présentez-vous au cabinet en quelques lignes : expérience,
          disponibilités. Le message est facultatif.
        </p>
        <Button onClick={() => setState("open")}>Postuler</Button>
      </section>
    );
  }

  return (
    <section aria-label="Postuler">
      <form onSubmit={handleSubmit}>
        <CountedTextarea
          label="Message au cabinet (optionnel)"
          value={draft}
          onChange={setDraft}
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={MESSAGE_PLACEHOLDER}
        />

        {error && (
          <InlineAlert as="p" tone="danger" className="mt-3">
            {error}
          </InlineAlert>
        )}

        <FormActions
          pending={sending}
          submitLabel="Envoyer la candidature"
          pendingLabel="Envoi…"
          onCancel={() => setState("closed")}
        />
      </form>
    </section>
  );
}
