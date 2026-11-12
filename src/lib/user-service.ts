/** The current user's account (Better-Auth managed: name, image, email). */

import { errorMessage } from "./api-errors";
import { authClient } from "./auth-client";
import type { ApiUser } from "./types/api";

/** The session's user, via the auth client so the shape is the SDK's. */
async function fetchUserInfo(): Promise<ApiUser> {
  const { data, error } = await authClient.getSession();
  if (error || !data?.user) {
    throw error ?? new Error("Failed to fetch user info");
  }
  // The SDK types the dates as `Date`; the wire carries ISO strings.
  return data.user as unknown as ApiUser;
}

/** POST /update-user — updates name and/or image. */
export async function updateUserInfo(payload: {
  name?: string;
  image?: string | null;
}): Promise<ApiUser> {
  const { error } = await authClient.updateUser(payload);
  if (error) {
    throw error;
  }
  return fetchUserInfo();
}

/**
 * POST /change-email — requests an email change. Depending on whether the
 * current address is verified, better-auth emails it for approval first or the
 * new address directly; the message covers both.
 */
export async function changeEmail(newEmail: string): Promise<{
  user: ApiUser;
  message: string;
}> {
  const { data, error } = await authClient.changeEmail({ newEmail });
  if (error) {
    throw error;
  }
  // better-auth's own enum: "Email updated" means applied immediately.
  const result = data as {
    user?: ApiUser;
    message?: "Email updated" | "Verification email sent";
  } | null;
  const message =
    result?.message === "Email updated"
      ? "Email mis à jour."
      : "Demande enregistrée. Un email de confirmation part soit vers votre adresse actuelle pour approuver le changement, soit directement vers la nouvelle adresse si celle-ci n'a jamais été vérifiée. Le changement n'est appliqué qu'après ces confirmations.";
  if (result?.user) {
    return { user: result.user, message };
  }
  return { user: await fetchUserInfo(), message };
}

/** The backend's English `message` is never passed through. */
export function mapUserError(error: unknown): string {
  return errorMessage(error, {
    conflict: "Cet email est déjà utilisé.",
    unavailable:
      "Impossible de mettre à jour vos informations. Veuillez réessayer.",
    "service-down":
      "Le service est hors service : vos informations n'ont pas été enregistrées. Réessayez dans quelques minutes.",
  });
}

/**
 * POST /delete-user — requests account erasure. Better Auth emails a 24h
 * confirmation link; the account is only anonymized once it is opened (see
 * /goodbye).
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await authClient.deleteUser();
  if (error) {
    throw new Error(mapDeleteAccountError(error));
  }
}

/** A rotated session is recoverable (sign in again), so it gets its own message. */
function mapDeleteAccountError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    /session/i.test((error as { message: string }).message)
  ) {
    return "Votre session est trop ancienne pour valider une suppression. Déconnectez-vous, reconnectez-vous, puis relancez la demande.";
  }
  return errorMessage(error, {
    unavailable:
      "Impossible d'envoyer la demande de suppression. Veuillez réessayer plus tard.",
    "service-down":
      "Le service est hors service : la demande n'a pas été envoyée. Réessayez dans quelques minutes.",
  });
}
