/**
 * Copy for the account-erasure panel (`/profile`), kept out of the component as
 * legal wording. It says « remplacées » because the backend anonymizes on
 * confirmation and purges later.
 */

export const erasedFields = [
  "votre nom, votre photo et votre adresse e-mail",
  "votre numéro RPPS et votre localisation",
  "le contenu de vos annonces et de vos cabinets",
  "les messages que vous avez écrits aux cabinets",
] as const;

export const deleteAccount = {
  title: "Supprimer mon compte",
  irreversibleIntro:
    "Cette action est irréversible. À la confirmation, nous remplaçons :",
  consequences:
    "Votre compte est déconnecté de tous vos appareils, et vous ne pouvez plus être contacté sur la plateforme. Vous pouvez recréer un compte avec la même adresse e-mail.",
  gracePeriod:
    "Les enregistrements restants sont définitivement effacés au terme d'un délai de grâce. Ce délai est celui de la suppression, pas une fenêtre pour annuler : aucun retour en arrière n'est possible une fois la confirmation envoyée.",
  confirmLabel:
    "Je comprends que cette action est irréversible et que les données ci-dessus seront remplacées, puis effacées.",
  submit: "Supprimer définitivement mon compte",
  pending: "Suppression du compte…",
  fallbackError:
    "Impossible de supprimer le compte pour le moment. Veuillez réessayer plus tard.",
} as const;

/**
 * What an erasure leaves behind (two keyed, non-reversible fingerprints plus
 * the dates), stated once for every screen and the privacy policy.
 */
export const ERASURE_RETENTION_FACT =
  "deux empreintes non réversibles — une sur votre identifiant, une sur votre adresse e-mail — ainsi que les dates de la demande";

/** Shown once the request is registered but before the email link is opened. */
export const deleteAccountRequested = {
  confirmation:
    "Votre demande est enregistrée. Un email de confirmation vient de partir : ouvrez le lien qu'il contient pour anonymiser définitivement votre compte. Ce lien est valable 24 heures. Jusqu'à confirmation, votre compte reste actif.",
  otherCandidates:
    "Si d'autres candidats vous ont adressé des candidatures, l'email vous en indique le nombre. Elles leur appartiennent : nous les conservons pour eux, qui en gardent l'accès, et vous n'y avez plus accès.",
  retention: `Conformément à notre politique de confidentialité, ${ERASURE_RETENTION_FACT} sont conservés, à des fins de preuve, pendant une durée limitée.`,
  privacyLinkLabel: "politique de confidentialité",
} as const;
