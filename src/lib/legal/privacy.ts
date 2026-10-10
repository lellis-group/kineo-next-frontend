import { ERASURE_RETENTION_FACT } from "@/lib/delete-account-content";

/**
 * The privacy policy's structure, as data.
 *
 * The policy is the one page whose content is bound by something other than taste:
 * a reader is entitled to read it, and it has to keep describing what the
 * platform actually does. So it lives apart from the route — next to
 * `lib/marketing.ts` and `lib/delete-account-content.ts`, which is the same
 * pattern — and what stays in the page is the composition of these lists into
 * prose, not the sentences themselves.
 *
 * Two kinds of section, deliberately not mixed:
 *
 *  - sections describing what the platform does today, verified against the
 *    schema and the services (data inventory, retention, erasure lifecycle).
 *    These are binding and are written in full;
 *  - sections only the legal team can settle (legal basis per purpose,
 *    sub-processor list, DPO, supervisory authority, hosting location). Rather
 *    than interrupt the reading flow with a badge in each one, they are collected
 *    in `PENDING_ITEMS` and shown once at the top, which is what makes the count
 *    there meaningful.
 *
 * A notice that invents those facts is worse than one that admits it is
 * incomplete, so the open items are named rather than papered over.
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

/**
 * Retention, per category.
 *
 * Two rows are deliberately "not defined" / grace period rather than a tidy
 * number: those are the cases where the honest answer is that no purge applies
 * yet, and inventing a duration would be the whole failure this policy exists to
 * avoid.
 */
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
