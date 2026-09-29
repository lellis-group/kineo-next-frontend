/**
 * Editorial content of the public pages.
 * Kept separate from components so organisms stay presentational.
 * Structural navigation lives in `lib/navigation.ts`.
 */

export const hero = {
  title: "Le remplacement médical,",
  titleAccent: "simplifié.",
  subtitle:
    "Kineo connecte médecins installés et remplaçants avec un suivi transparent et une gestion administrative automatisée.",
  primaryCta: { label: "Trouver un remplaçant", href: "/signup" },
  secondaryCta: { label: "Chercher un remplacement", href: "/signup" },
  /** Live console preview panel (hero side visual). */
  livePreview: {
    caption: "kineo-live-console",
    contractTitle: "Contrat Généré #8012",
    contractStatus: "Actif",
    cabinet: "Cabinet Médical des Pins - Dr. J. Martin",
    period: "Période: 15 Fév - 22 Fév (Gironde)",
  },
};

export const trustBar = {
  eyebrow: "Plateforme régulée & sécurisée",
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

/**
 * PLACEHOLDER STATS — the proof bar was replaced by the testimonials section
 * (landing mockup). Kept for a future "numbers" block; unused by PublicHome.
 */
export const proofStats = {
  items: [
    { value: 250, suffix: "+", label: "Professionnels de santé inscrits" },
    { value: 42, suffix: "", label: "Départements couverts" },
    { value: 900, suffix: "+", label: "Candidatures traitées chaque mois" },
  ] as const,
};

export interface FeatureItem {
  icon: "pencil" | "users" | "mapPin";
  title: string;
  description: string;
}

export const featuresSection = {
  title: "Tout pour gérer vos remplacements",
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

export interface HowItWorksStep {
  icon: "pencil" | "users" | "check";
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
      description:
        "Dates, rétrocession, attentes : décrivez votre besoin en deux minutes, sans formalités inutiles.",
    },
    {
      icon: "users",
      title: "Recevez des candidatures vérifiées",
      description:
        "Les remplaçants RPPS vérifiés postulent avec un message personnalisé. Vous suivez tout en temps réel.",
    },
    {
      icon: "check",
      title: "Choisissez et validez",
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
  description:
    "La plateforme moderne dédiée à la mise en relation et à la simplification administrative du remplacement médical en France.",
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
