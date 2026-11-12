import type { Metadata } from "next";
import { LegalDocument } from "@/components/templates/legal-document";
import {
  BulletList,
  Paragraph,
  Subheading,
} from "@/components/templates/legal-primitives";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Kineo",
  description: "Conditions d'utilisation de la console de remplacement Kineo.",
};

/**
 * Terms of service — the definitive text is being drafted; the sections are
 * listed and marked pending rather than shipping placeholder terms.
 */
export default function TermsPage() {
  return (
    <LegalDocument
      title="Conditions d'utilisation"
      updatedAt="3 septembre 2026"
      backHref="/signup"
      backLabel="← Retour à l'inscription"
    >
      <Paragraph>
        Les conditions générales d'utilisation de la console Kineo sont en cours
        de rédaction par notre service juridique. Elles seront publiées ici
        avant la mise en production de la plateforme.
      </Paragraph>

      <div className="mt-8 space-y-3">
        <Subheading>Elles couvriront notamment :</Subheading>
        <BulletList
          items={[
            "L'objet du service et son accès",
            "La création et la gestion du compte utilisateur",
            "Le traitement des données personnelles (RGPD)",
            "La propriété intellectuelle",
            "La responsabilité des parties",
            "Les modalités de modification des présentes conditions",
            "Le contact du support Kineo",
          ]}
        />
      </div>
    </LegalDocument>
  );
}
