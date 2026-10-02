/**
 * Profile data service — fetch, create and update the current user's profile.
 * Soft/blocking 404 policy: only GET /profile/me treats 404 as expected.
 */

import { cache } from "react";
import {
  ApiError,
  type ApiTransport,
  apiFetch,
  type FieldError,
  notFoundAs,
} from "./api-client";
import { errorMessage } from "./api-errors";
import type { ProfileFormData } from "./profile";
import type { ApiProfile } from "./types/api";

/**
 * GET /profile/me — soft 404 when the profile does not exist yet (documented
 * by the API); returns null so callers can show the create form instead.
 *
 * Cached per request. `fetchServerAuth` reads this same row to resolve the role
 * for the header, and the profile and dashboard routes read it for the page
 * itself, so every one of those renders used to ask the backend twice. React
 * dedupes on the arguments and the `serverTransport` a server component passes
 * is a module constant, so those call sites collapse into a single request.
 *
 * Only the two callers that pass the same transport share a result — the header
 * reads it from a client component with no transport at all, and gets its own.
 *
 * The soft 404 stays exactly as narrow as it was. This function is best-effort
 * for the header's sake, but a page still has to be able to tell "no profile
 * yet" apart from "the backend is down", and it can: only a 404 resolves to
 * null, everything else still throws. Reading the profile out of
 * `fetchServerAuth` instead would have collapsed precisely those two cases — its
 * own read swallows any failure and reports `null` — and turned an outage into
 * a redirect to the onboarding form.
 */
export const fetchMyProfile = cache(
  async (transport?: ApiTransport): Promise<ApiProfile | null> =>
    apiFetch<ApiProfile>("/profile/me", undefined, transport).catch(
      notFoundAs(null),
    ),
);

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

/**
 * Maps a profile failure to a user-facing French message.
 *
 * The backend's own `message` is not passed through: it is written in English
 * ("City must contain only letters"), and this UI is French — only the Zod
 * field issues are translated, one by one, in `PROFILE_MESSAGE_OVERRIDES`.
 */
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
    if (error.status === 403) {
      // `PATCH /profile/:id` used to be reachable without a verified address:
      // `EmailVerifiedGuard` only sat on the four `POST` handlers, so an
      // unverified account could create a profile and then edit it freely. The
      // backend now gates every write, which is right — and means the sentence
      // has to name the address, not only the ownership the user cannot fix.
      return "Vous n'êtes pas le propriétaire de ce profil, ou votre adresse e-mail n'est pas validée.";
    }
  }
  return errorMessage(error, {
    forbidden:
      "Impossible d'enregistrer : votre adresse e-mail n'est pas validée.",
    unavailable:
      "Impossible d'enregistrer le profil. Vérifiez votre connexion, puis réessayez.",
    "service-down":
      "Le service est hors service : le profil n'a pas été enregistré. Réessayez dans quelques minutes.",
  });
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
