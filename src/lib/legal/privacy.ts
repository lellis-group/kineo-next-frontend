import { ERASURE_RETENTION_FACT } from "@/lib/delete-account-content";

/**
 * The privacy policy's structure, as data. Sections describing what the
 * platform does today are written in full; what only the legal team can
 * settle is listed once in `PENDING_ITEMS` rather than invented.
 */

/** Anchors, in reading order — the sidebar and the headings share the ids. */
export const PRIVACY_SECTIONS = [
  { id: "responsable", label: "Responsable de traitement" },
  { id: "donnees", label: "Données collectées" },
  { id: "finalites", label: "Finalités et bases légales" },
  { id: "conservation", label: "Durées de conservation" },
  { id: "suppression", label: "Suppression de votre compte" },
  { id: "droits", label: "Vos droits" },
  { id: "sous-traitants", label: "Sous-traitants" },
  { id: "securite", label: "Sécurité" },
  { id: "contact", label: "Nous contacter" },
] as const;

/** Still to be settled by the legal team, surfaced once at the top. */
export const PENDING_ITEMS = [
  "Identité légale et adresse du siège (section 1)",
  "Base légale et finalité de chaque traitement (section 3)",
  "Durée de conservation des annonces, cabinets et candidatures (section 4)",
  "Modalités d'exercice des droits non encore automatisés (section 6)",
  "Liste des sous-traitants et localisation de l'hébergement (section 7)",
  "Contact du DPO et autorité de contrôle (section 9)",
] as const;

/** Retention, per category. "Non définies" where no purge applies yet. */
export const RETENTION_PERIODS = [
  {
    data: "Sessions de connexion expirées",
    duration: "Purge à l'échéance",
    note: "Balayage horaire. Supprime le jeton, l'adresse IP et l'agent utilisateur.",
  },
  {
    data: "Jetons de vérification expirés",
    duration: "Purge à l'échéance",
    note: "Ces lignes contiennent l'adresse e-mail en clair tant qu'elles sont valides, y compris pour une demande de suppression abandonnée.",
  },
  {
    data: "Trace d'une demande de suppression exécutée",
    duration: "365 jours",
    note: `${ERASURE_RETENTION_FACT.charAt(0).toUpperCase()}${ERASURE_RETENTION_FACT.slice(1)}. Aucun nom, aucune adresse e-mail.`,
  },
  {
    data: "Trace d'une demande jamais confirmée",
    duration: "30 jours",
    note: "Elle n'a enregistré qu'une intention.",
  },
  {
    data: "Compte anonymisé",
    duration: "30 jours",
    note: "Délai de grâce avant suppression définitive. Voir la section 5.",
  },
  {
    data: "Annonces, cabinets et candidatures",
    duration: "Non définies",
    note: "Aucune purge automatique ne s'applique à ces données tant que le compte est actif.",
  },
] as const;
