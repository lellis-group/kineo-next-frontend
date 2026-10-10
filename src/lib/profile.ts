/**
 * The RPPS number's rule, in one place.
 *
 * It was written five times: as a regex here, as a `pattern` and a `maxLength`
 * in the form, and as two different French sentences in the validator and the
 * error translator. `maxLength` cannot read a regex, so `RPPS_DIGITS` exists for
 * it — and the length the form allows is derived from the pattern rather than
 * decided again.
 */
export const RPPS_DIGITS = 11;
export const RPPS_PATTERN = new RegExp(`^\\d{${RPPS_DIGITS}}$`);
export const RPPS_ERROR_MESSAGE = `Le numéro RPPS doit contenir exactement ${RPPS_DIGITS} chiffres.`;

/** Mirrors the backend's `city` bound (`textField(100, "City")`). */
export const CITY_MAX_LENGTH = 100;

import type { ApiProfile, ProfileType, Specialty } from "./types/api";

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  GENERALIST: "Médecine générale",
  DENTIST: "Chirurgien-dentiste",
  DERMATOLOGIST: "Dermatologie",
  PSYCHIATRIST: "Psychiatrie",
  OTHER: "Autre spécialité",
};

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  INSTALLED: "Médecin installé",
  REPLACEMENT: "Remplaçant",
  BOTH: "Les deux",
};

export const PROFILE_TYPE_DESCRIPTIONS: Record<ProfileType, string> = {
  INSTALLED: "Vous publiez des annonces pour trouver un remplaçant.",
  REPLACEMENT: "Vous cherchez des remplacements à pourvoir.",
  BOTH: "Vous publiez des annonces et candidatez aux remplacements.",
};

/** "Membre depuis {month year}" — fr-FR locale. */
export function formatMemberSince(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

/** Valid, normalized profile payload sent to the API. */
export interface ProfileFormData {
  specialty: Specialty;
  profileType: ProfileType;
  rppsNumber?: string;
  city?: string;
  isPublic: boolean;
}

/** Raw form state — select values may still be empty before user input. */
export interface ProfileFormValues {
  specialty: Specialty | "";
  profileType: ProfileType | "";
  rppsNumber: string;
  city: string;
  isPublic: boolean;
}

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  specialty: "",
  profileType: "",
  rppsNumber: "",
  city: "",
  isPublic: true,
};

export function profileToFormValues(profile: ApiProfile): ProfileFormValues {
  return {
    specialty: profile.specialty,
    profileType: profile.profileType,
    rppsNumber: profile.rppsNumber ?? "",
    city: profile.city ?? "",
    isPublic: profile.isPublic ?? true,
  };
}

export interface ProfileFormResult {
  payload?: ProfileFormData;
  error?: string;
}

/** Validates raw form values; returns the normalized payload or a French error message. */
export function validateProfileForm(
  values: ProfileFormValues,
): ProfileFormResult {
  if (!values.specialty) {
    return { error: "Sélectionnez votre spécialité." };
  }
  if (!values.profileType) {
    return { error: "Sélectionnez votre type de pratique." };
  }

  const rpps = values.rppsNumber.trim();
  if (rpps && !RPPS_PATTERN.test(rpps)) {
    return { error: RPPS_ERROR_MESSAGE };
  }

  const city = values.city.trim();
  if (city.length > CITY_MAX_LENGTH) {
    return {
      error: `Le nom de la ville ne peut pas dépasser ${CITY_MAX_LENGTH} caractères.`,
    };
  }

  return {
    payload: {
      specialty: values.specialty,
      profileType: values.profileType,
      rppsNumber: rpps || undefined,
      city: city || undefined,
      isPublic: values.isPublic,
    },
  };
}
