/** The current user's profile: fetch, create, update. */

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
import { RPPS_DIGITS } from "./profile";
import type { ApiProfile } from "./types/api";

/**
 * GET /profile/me — null when there is no profile yet; any other failure
 * throws, so a page can tell « no profile » from an outage. Cached per
 * request, so server callers passing `serverTransport` share one read.
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
  transport?: ApiTransport,
): Promise<ApiProfile> {
  return apiFetch<ApiProfile>(
    "/profile",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    transport,
  );
}

/** PATCH /profile/{id} — partial update of an existing profile. */
export async function updateProfile(
  id: string,
  payload: ProfileFormData,
  transport?: ApiTransport,
): Promise<ApiProfile> {
  return apiFetch<ApiProfile>(
    `/profile/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    transport,
  );
}

/** The backend's English `message` is never passed through; field issues are translated. */
export function mapProfileError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors && error.fieldErrors.length > 0) {
      return formatFieldErrors(error.fieldErrors, PROFILE_FIELD_LABELS, {
        "City must contain only letters, spaces, hyphens or apostrophes":
          "ne peut contenir que des lettres, espaces, tirets ou apostrophes.",
        "String must be 11 digits": `doit contenir exactement ${RPPS_DIGITS} chiffres.`,
        "latitude and longitude must be provided together":
          "la latitude et la longitude doivent être renseignées ensemble.",
      });
    }
    if (error.status === 409) {
      return "Ce numéro RPPS est déjà utilisé par un autre profil.";
    }
    if (error.status === 403) {
      // Every profile write is gated on a verified email too.
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

const PROFILE_FIELD_LABELS: Record<string, string> = {
  specialty: "Spécialité",
  profileType: "Type de pratique",
  rppsNumber: "Numéro RPPS",
  city: "Ville principale",
  latitude: "Latitude",
  longitude: "Longitude",
  isPublic: "Visibilité publique",
};

/** One "Label : message" line per backend field issue. */
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
