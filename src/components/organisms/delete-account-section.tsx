"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { TrashIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";

export interface DeleteAccountSectionProps {
  /** Triggers account deletion + post-action sign-out/redirect. */
  onDeleteAccount: () => Promise<void>;
}

/**
 * What the erasure overwrites, one item per line. Listed rather than run
 * together in a parenthetical: this is the part a person decides on, and it has
 * to be scannable before they tick the box.
 */
const ERASED_FIELDS = [
  "votre nom, votre photo et votre adresse e-mail",
  "votre numéro RPPS et votre localisation",
  "le contenu de vos annonces et de vos cabinets",
  "les messages que vous avez écrits aux cabinets",
] as const;

/**
 * Destructive "Supprimer mon compte" panel.
 * Requires an explicit confirmation checkbox before the delete button is
 * enabled; surfaces errors inline. Placed at the bottom of the profile view.
 *
 * The backend anonymizes rather than deletes: personal fields are overwritten
 * and sessions revoked on confirmation, and the rows are dropped later by the
 * purge sweep. The copy below says exactly that, because "supprimé
 * définitivement" would be a promise the platform does not keep on the spot.
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
        e instanceof Error && e.message
          ? e.message
          : "Impossible de supprimer le compte pour le moment. Veuillez réessayer plus tard.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (requested) {
    return (
      <section aria-label="Suppression du compte">
        <Card className="border-danger/30 bg-danger/5 p-6">
          <InlineAlert tone="info">
            Votre demande est enregistrée. Un email de confirmation vient de
            partir : ouvrez le lien qu'il contient pour anonymiser
            définitivement votre compte. Ce lien est valable 24&nbsp;heures.
            Jusqu'à confirmation, votre compte reste actif.
          </InlineAlert>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            Si des candidats ont encore des candidatures actives sur vos
            annonces, l'email vous le signale et la confirmation sera refusée :
            fermez ou annulez ces annonces d&apos;abord.
          </p>

          <p className="mt-3 text-xs text-muted">
            Conformément à notre{" "}
            <Link
              href="/privacy"
              className="underline transition-colors hover:text-primary"
            >
              politique de confidentialité
            </Link>
            , seule une empreinte non réversible de votre identité et les dates
            de la demande sont conservées, à des fins de preuve, pendant une
            durée limitée.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label="Suppression du compte">
      <Card className="border-danger/30 bg-danger/5 p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger"
          >
            <TrashIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-danger">
              Supprimer mon compte
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              Cette action est irréversible. À la confirmation, nous
              remplaçons&nbsp;:
            </p>

            <ul className="mt-2.5 space-y-1.5">
              {ERASED_FIELDS.map((item) => (
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
              Votre compte est déconnecté de tous vos appareils, et vous ne
              pouvez plus être contacté sur la plateforme. Vous pouvez recréer
              un compte avec la même adresse e-mail.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Les enregistrements restants sont définitivement effacés au terme
              d&apos;un délai de grâce. Ce délai est celui de la suppression,
              pas une fenêtre pour annuler&nbsp;: aucun retour en arrière
              n&apos;est possible une fois la confirmation envoyée.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-danger"
            />
            <span className="text-foreground/85">
              Je comprends que cette action est irréversible et que les données
              ci-dessus seront remplacées, puis effacées.
            </span>
          </label>
        </div>

        {error && (
          <InlineAlert as="p" tone="danger" className="mt-4">
            {error}
          </InlineAlert>
        )}

        <Button
          variant="danger"
          disabled={!confirmed || submitting}
          onClick={handleDelete}
          className="mt-4 w-full"
        >
          {submitting && (
            <Spinner className="h-4 w-4 border-danger-foreground/30 border-t-danger-foreground" />
          )}
          {submitting
            ? "Suppression du compte…"
            : "Supprimer définitivement mon compte"}
        </Button>
      </Card>
    </section>
  );
}
