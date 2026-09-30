import type { Metadata } from "next";
import { LegalDocument } from "@/components/templates/legal-document";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Kineo",
  description: "Conditions d'utilisation de la console de remplacement Kineo.",
};

/**
 * Terms of service — definitive text is being drafted. The sections listed below
 * are the standard ToS structure; the legal team completes them before
 * production. Stating what the page does not yet say is better than shipping
 * placeholder terms that read as final.
 */
export default function TermsPage() {
  return (
    <LegalDocument
      title="Conditions d'utilisation"
      updatedAt="3 septembre 2026"
      backHref="/signup"
      backLabel="← Retour à l'inscription"
    >
      <p className="text-sm leading-relaxed text-foreground/75 sm:text-[0.925rem]">
        Les conditions générales d'utilisation de la console Kineo sont en cours
        de rédaction par notre service juridique. Elles seront publiées ici
        avant la mise en production de la plateforme.
      </p>

      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Elles couvriront notamment :</h2>
        <ul className="space-y-2">
          {[
            "L'objet du service et son accès",
            "La création et la gestion du compte utilisateur",
            "Le traitement des données personnelles (RGPD)",
            "La propriété intellectuelle",
            "La responsabilité des parties",
            "Les modalités de modification des présentes conditions",
            "Le contact du support Kineo",
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
    </LegalDocument>
  );
}
