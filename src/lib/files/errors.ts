/** French wording for the failures an upload can answer with. */

import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";

/** A missing profile CV is the one expected refusal of a CV attachment. */
export function cvAttachErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Ajoutez d'abord un CV à votre profil, puis envoyez votre candidature.";
  }
  return fileErrorMessage(error);
}

/**
 * `413` is not a status the shared classifier knows yet, so it is handled here
 * rather than silently falling through to "une erreur inattendue".
 */
export function fileErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 413) {
    return "Ce fichier est trop volumineux. Réessayez avec un fichier plus petit.";
  }
  if (error instanceof ApiError && error.status === 415) {
    return "Ce format de fichier n'est pas accepté.";
  }
  return errorMessage(error, {
    "not-found": "Ce fichier n'est plus disponible. Rechargez la page.",
    forbidden: "Vous n'avez pas le droit de modifier ce fichier.",
    validation:
      "Le fichier n'a pas été accepté : vérifiez son format et sa taille.",
    conflict: "Le fichier n'a pas pu être enregistré dans l'état actuel.",
  });
}
