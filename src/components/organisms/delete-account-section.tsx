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
  ERASURE_RETENTION_FACT,
  erasedFields,
} from "@/lib/delete-account-content";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";

export interface DeleteAccountSectionProps {
  /** Triggers account deletion + post-action sign-out/redirect. */
  onDeleteAccount: () => Promise<void>;
}

/** The destructive « Supprimer mon compte » panel, behind a confirmation checkbox. */
export function DeleteAccountSection({
  onDeleteAccount,
}: DeleteAccountSectionProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [requested, setRequested] = useState(false);
  const {
    pending: submitting,
    error,
    run,
  } = useAsyncSubmit((e) =>
    e instanceof Error && e.message ? e.message : copy.fallbackError,
  );

  async function handleDelete() {
    if (!confirmed) return;
    // The account is only anonymized once the emailed link is opened.
    if (await run(onDeleteAccount)) setRequested(true);
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
          , {ERASURE_RETENTION_FACT} sont conservés, à des fins de preuve,
          pendant une durée limitée.
        </p>
      </DangerPanel>
    </section>
  );
}
