/**
 * Profile data service — fetch, create and update the current user's profile.
 * Soft/blocking 404 policy: only GET /profile/me treats 404 as expected.
 */

import { ApiError, apiFetch, type FieldError, notFoundAs } from "./api-client";
import type { ProfileFormData } from "./profile";
import type { ApiProfile } from "./types/api";

/**
 * GET /profile/me — soft 404 when the profile does not exist yet (documented
 * by the API); returns null so callers can show the create form instead.
 */
export async function fetchMyProfile(): Promise<ApiProfile | null> {
  return apiFetch<ApiProfile>("/profile/me").catch(notFoundAs(null));
}

/** POST /profile — creates the profile for the current user (201, 403, 409). */
export async function createProfile(
  payload: ProfileFormData,
): Promise<ApiProfile> {
  return apiFetch<ApiProfile>("/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /profile/{id} — partial update of an existing profile. */
export async function updateProfile(
  id: string,
  payload: ProfileFormData,
): Promise<ApiProfile> {
  return apiFetch<ApiProfile>(`/profile/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Maps an API error to a user-facing French message. */
export function mapProfileError(error: unknown): string {
  if (error instanceof ApiError) {
    // Zod field-level errors (e.g. {"message":"Validation failed","errors":[{"path":["city"],"message":"City must contain only letters..."}]})
    if (error.fieldErrors && error.fieldErrors.length > 0) {
      return formatFieldErrors(error.fieldErrors, PROFILE_FIELD_LABELS, {
        "City must contain only letters, spaces, hyphens or apostrophes":
          "ne peut contenir que des lettres, espaces, tirets ou apostrophes.",
        "String must be 11 digits": "doit contenir exactement 11 chiffres.",
        "latitude and longitude must be provided together":
          "la latitude et la longitude doivent être renseignées ensemble.",
      });
    }
    if (error.status === 409) {
      return "Ce numéro RPPS est déjà utilisé par un autre profil.";
    }
    if (error.apiMessage) {
      return error.apiMessage;
    }
    if (error.status === 401) {
      return "Votre session a expiré. Veuillez vous reconnecter.";
    }
    if (error.status === 403) {
      return "Action non autorisée. Vérifiez que votre adresse e-mail est validée.";
    }
  }
  return "Impossible d'enregistrer le profil. Vérifiez votre connexion, puis réessayez.";
}

/** French labels for profile fields — used when formatting Zod `path` issues. */
const PROFILE_FIELD_LABELS: Record<string, string> = {
  specialty: "Spécialité",
  profileType: "Type de pratique",
  rppsNumber: "Numéro RPPS",
  city: "Ville principale",
  latitude: "Latitude",
  longitude: "Longitude",
  isPublic: "Visibilité publique",
};

/**
 * Formats a list of backend field errors into a single user-facing string.
 * Each issue is rendered as "Label : translated message" joined by " · ".
 */
function formatFieldErrors(
  fieldErrors: ReadonlyArray<FieldError>,
  labels: Record<string, string>,
  translations: Record<string, string>,
): string {
  return fieldErrors
    .map((fe) => {
      const key = fe.path.length > 0 ? String(fe.path[0] ?? "?") : "?";
      const label = labels[key] ?? key;
      const message = translations[fe.message] ?? fe.message;
      return `${label} : ${message}`;
    })
    .join("\n");
}
