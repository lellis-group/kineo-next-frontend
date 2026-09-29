import type { Metadata } from "next";
import Link from "next/link";
import { KineoLogo } from "@/components/atoms/kineo-logo";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kineo",
  description:
    "Politique de confidentialité (RGPD) de la console de remplacement Kineo.",
};

/**
 * Privacy policy — definitive text is being drafted by the legal team.
 *
 * Already binding today: the account-erasure trail (two non-reversible
 * fingerprints + timestamps, never the email) is retained for a bounded period
 * (backend `DATA_DELETION_REQUEST_RETENTION_DAYS`, default 365 days) then
 * erased by the hourly retention sweep. A request that was never confirmed only
 * recorded an intention and is dropped after
 * `PENDING_DELETION_REQUEST_RETENTION_DAYS` (default 30 days).
 */

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6 sm:py-14">
      <article className="mx-auto w-full max-w-2xl">
        <header className="mb-10 flex flex-col items-center gap-7 text-center">
          <Link href="/" aria-label="Kineo — Accueil">
            <KineoLogo />
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Politique de confidentialité
            </h1>
            <p className="text-sm text-muted">
              Dernière mise à jour : 11 septembre 2026
            </p>
          </div>
        </header>

        <p className="text-sm leading-relaxed text-foreground/75 sm:text-[0.925rem]">
          La politique de confidentialité de la console Kineo est en cours de
          rédaction par notre service juridique. Elle sera publiée ici avant la
          mise en production de la plateforme.
        </p>

        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Elle couvrira notamment :</h2>
          <ul className="space-y-2">
            {[
              "Les données collectées et leur finalité",
              "La durée de conservation des données et des traces de demandes de suppression",
              "Vos droits (accès, rectification, effacement, portabilité)",
              "Les sous-traitants et l'hébergement des données",
              "Le contact du délégué à la protection des données (DPO)",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-foreground/85"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-14 border-t border-border pt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            ← Retour à l&apos;accueil
          </Link>
        </footer>
      </article>
    </main>
  );
}
