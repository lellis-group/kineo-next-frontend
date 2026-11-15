export const hero = {
  title: "Le remplacement médical,",
  titleAccent: "simplifié.",
  subtitle:
    "Kineo connecte médecins installés et remplaçants avec un suivi transparent et une gestion administrative automatisée.",
  primaryCta: { label: "Trouver un remplaçant", href: "/signup" },
  secondaryCta: { label: "Chercher un remplacement", href: "/signup" },
};

/**
 * The hero's console preview: a still of the practice board, drawn with the
 * board's own panels. Sample data, never a real member or posting.
 */
export const consolePreview = {
  caption: "console.kineo.fr",
  rail: {
    title: "Recrutement",
    chips: [
      { icon: "clock", label: "En cours", value: "6" },
      { icon: "file", label: "Candidatures", value: "14" },
      { icon: "check", label: "Pourvues", value: "9" },
    ],
    percent: 60,
    caption: "9 annonces pourvues sur 15",
    specialties: [
      { label: "Généraliste", count: 9, percent: 60 },
      { label: "Pédiatrie", count: 4, percent: 27 },
      { label: "Dermatologie", count: 2, percent: 13 },
    ],
  },
  map: {
    search: "Bordeaux, Gironde",
    popup: { title: "Cabinet des Pins", detail: "Généraliste · 15–22 fév." },
  },
  table: {
    title: "Mes offres",
    columns: ["Annonce", "Période", "Statut"],
    rows: [
      {
        title: "Médecine générale",
        place: "Bordeaux",
        period: "15–22 fév.",
        candidates: "4",
        status: { label: "Ouverte", tone: "success" },
      },
      {
        title: "Pédiatrie",
        place: "Mérignac",
        period: "3–14 mars",
        candidates: "7",
        status: { label: "En discussion", tone: "info" },
      },
      {
        title: "Dermatologie",
        place: "Pessac",
        period: "1–5 avr.",
        candidates: "2",
        status: { label: "Urgente", tone: "warning" },
      },
    ],
  },
} as const;

export const trustBar = {
  items: [
    {
      icon: "shield",
      label: "Vérification RPPS",
    },
    {
      icon: "calendar",
      label: "Suivi en temps réel",
    },
    {
      icon: "percent",
      label: "Gratuit en bêta",
    },
  ] as const,
};

export interface FeatureItem {
  icon: "pencil" | "users" | "mapPin";
  title: string;
  description: string;
}

export const featuresSection = {
  title: "Tout pour gérer vos remplacements",
  subtitle:
    "Une seule console pour publier, recevoir et décider — côté cabinet comme côté remplaçant.",
  features: [
    {
      icon: "pencil",
      title: "Publiez en 2 minutes",
      description:
        "Remplissez un court questionnaire avec vos besoins, les dates et la rétrocession proposée.",
    },
    {
      icon: "users",
      title: "Candidatures transparentes",
      description:
        "Consultez les profils qualifiés, vérifiés par l'Ordre des Médecins, et échangez en direct.",
    },
    {
      icon: "mapPin",
      title: "Recherche géolocalisée",
      description:
        "Trouvez des opportunités ou des remplaçants ciblés dans votre département.",
    },
  ] as FeatureItem[],
};

/** Sample content drawn inside the three feature panels. Never real members. */
export const featurePreviews = {
  publish: {
    fields: [
      { label: "Spécialité", value: "Médecine générale" },
      { label: "Période", value: "15 → 22 février" },
    ],
    retrocession: { label: "Rétrocession", percent: 75 },
    submit: "Publier l'annonce",
  },
  candidates: [
    {
      name: "Dr. Anaïs Laurent",
      detail: "Remplaçante · 4 ans",
      status: { label: "Présélectionnée", tone: "info" },
    },
    {
      name: "Dr. Hugo Martin",
      detail: "Remplaçant · 2 ans",
      status: { label: "En attente", tone: "warning" },
    },
    {
      name: "Dr. Léa Morel",
      detail: "Remplaçante · 6 ans",
      status: { label: "Acceptée", tone: "success" },
    },
  ],
  map: { search: "Gironde", radius: "30 km", results: "12 annonces" },
} as const;

export interface HowItWorksStep {
  icon: "pencil" | "users" | "check";
  /** Who acts at this step, shown as the row's status. */
  actor: string;
  /** How long the step takes, in the row's right column. */
  duration: string;
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const testimonialsSection = {
  title: "Plus de 2000 médecins nous font confiance",
  rating: "4.9/5",
  ratingLabel: "avis professionnels",
  testimonials: [
    {
      quote:
        "Grâce à Kineo, j'ai trouvé un remplaçant sérieux pour mes deux semaines de congés en moins de 48h.",
      name: "Dr. Michel V.",
      role: "Généraliste - Lyon",
    },
    {
      quote:
        "L'automatisation du contrat et de la signature électronique m'évite de longues heures de paperasse.",
      name: "Dr. Clara D.",
      role: "Médecin remplaçante - Bordeaux",
    },
    {
      quote:
        "Une interface claire et des profils vérifiés. C'est exactement ce qu'il manquait pour nos cabinets ruraux.",
      name: "Dr. Étienne L.",
      role: "Pédiatre - Dax",
    },
  ] as Testimonial[],
};

export const howItWorks = {
  title: "Comment ça marche",
  subtitle:
    "Un parcours en trois étapes, pensé pour les deux côtés de la table : du besoin au remplacement finalisé.",
  steps: [
    {
      icon: "pencil",
      title: "Publiez votre annonce",
      actor: "Cabinet",
      duration: "2 min",
      description:
        "Dates, rétrocession, attentes : décrivez votre besoin en deux minutes, sans formalités inutiles.",
    },
    {
      icon: "users",
      title: "Recevez des candidatures vérifiées",
      actor: "Remplaçants",
      duration: "En continu",
      description:
        "Les remplaçants RPPS vérifiés postulent avec un message personnalisé. Vous suivez tout en temps réel.",
    },
    {
      icon: "check",
      title: "Choisissez et validez",
      actor: "Cabinet",
      duration: "1 clic",
      description:
        "Comparez les profils, échangez, puis acceptez la candidature idéale. Le reste se passe sereinement.",
    },
  ] as HowItWorksStep[],
};

export const joinCta = {
  title: "Rejoignez Kineo gratuitement",
  subtitle:
    "Inscrivez-vous dès aujourd'hui pour simplifier votre prochain remplacement médical.",
  emailPlaceholder: "votre.email@rpps.fr",
  submitLabel: "Commencer",
};

export const footerContent = {
  productLinks: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Comment ça marche", href: "#how-it-works" },
    { label: "Tarifs", href: "#" },
    { label: "Console Live", href: "#" },
  ],
  legalLinks: [
    { label: "À propos", href: "#" },
    { label: "Contact", href: "#" },
    { label: "CGU", href: "/terms" },
    { label: "Confidentialité", href: "/privacy" },
  ],
  tagline: "Conçu pour les professionnels de santé français.",
};
