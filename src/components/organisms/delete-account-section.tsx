"use client";

import Link from "next/link";
import { useState } from "react";
import { TrashIcon } from "@/components/atoms/icons";
import { DangerPanel } from "@/components/molecules/danger-panel";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import {
  deleteAccount as copy,
  deleteAccountRequested,
  erasedFields,
} from "@/lib/delete-account-content";

export interface DeleteAccountSectionProps {
  /** Triggers account deletion + post-action sign-out/redirect. */
  onDeleteAccount: () => Promise<void>;
}

/**
 * Destructive "Supprimer mon compte" panel.
 * Requires an explicit confirmation checkbox before the delete button is
 * enabled; surfaces errors inline. Placed at the bottom of the profile view.
 */
export function DeleteAccountSection({
  onDeleteAccount,
}: DeleteAccountSectionProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirmed) return;
    setError("");
    setSubmitting(true);
    try {
      // Success = the deletion request is registered and a confirmation
      // email is on its way; the account is anonymized only once the email
      // link is opened (see /goodbye).
      await onDeleteAccount();
      setRequested(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : copy.fallbackError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (requested) {
    return <ErasureRequested />;
  }

  return (
    <section aria-label="Suppression du compte">
      <DangerPanel
        icon={<TrashIcon className="h-5 w-5" />}
        title={copy.title}
        headingLevel="h2"
        className="p-6"
      >
        <p className="mt-0.5 text-sm leading-relaxed text-muted">
          {copy.irreversibleIntro}
        </p>

        <ul className="mt-2.5 space-y-1.5">
          {erasedFields.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/85"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger/60"
              />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          {copy.consequences}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {copy.gracePeriod}
        </p>

        <div className="mt-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-danger"
            />
            <span className="text-foreground/85">{copy.confirmLabel}</span>
          </label>
        </div>

        {error && (
          <InlineAlert as="p" tone="danger" className="mt-4">
            {error}
          </InlineAlert>
        )}

        <PendingButton
          variant="danger"
          pending={submitting}
          disabled={!confirmed}
          onClick={handleDelete}
          className="mt-4 w-full"
          idleLabel={copy.submit}
          pendingLabel={copy.pending}
        />
      </DangerPanel>
    </section>
  );
}

/**
 * The state after the request is sent.
 *
 * Its own tree rather than a branch inside the panel above: it replaces every
 * action on the page, so it is not a variant of the same thing.
 */
function ErasureRequested() {
  return (
    <section aria-label="Suppression du compte">
      <DangerPanel className="p-6">
        <InlineAlert tone="info">
          {deleteAccountRequested.confirmation}
        </InlineAlert>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          {deleteAccountRequested.otherCandidates}
        </p>

        <p className="mt-3 text-xs text-muted">
          Conformément à notre{" "}
          <Link
            href="/privacy"
            className="underline transition-colors hover:text-primary"
          >
            {deleteAccountRequested.privacyLinkLabel}
          </Link>
          , seule une empreinte non réversible de votre identité et les dates de
          la demande sont conservées, à des fins de preuve, pendant une durée
          limitée.
        </p>
      </DangerPanel>
    </section>
  );
}
