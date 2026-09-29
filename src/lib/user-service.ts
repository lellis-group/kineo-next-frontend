/**
 * User account service — fetch and update the current user's account info
 * (Better-Auth managed: name, image, email, emailVerified).
 */

import { authClient } from "./auth-client";
import type { ApiUser } from "./types/api";

/** GET /get-session — returns the current user. */
export async function fetchUserInfo(): Promise<ApiUser> {
  const { data, error } = await authClient.getSession();
  if (error || !data?.user) {
    throw error ?? new Error("Failed to fetch user info");
  }
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
 * POST /change-email — requests an email change. If the instance requires
 * verification, a confirmation link is sent to the new address and the email
 * is only updated once verified.
 */
export async function changeEmail(newEmail: string): Promise<{
  user: ApiUser;
  message: string;
}> {
  const { data, error } = await authClient.changeEmail({ newEmail });
  if (error) {
    throw error;
  }
  const message =
    (data as { message?: string }).message === "Email updated"
      ? "Email mis à jour."
      : "Un email de vérification a été envoyé à la nouvelle adresse.";
  const user = (data as { user?: ApiUser }).user;
  if (user) {
    return { user: user as ApiUser, message };
  }
  return { user: await fetchUserInfo(), message };
}

/** Maps an API error to a user-facing French message. */
export function mapUserError(error: unknown): string {
  const status =
    typeof error === "object" && error && "status" in error
      ? (error as { status?: number }).status
      : undefined;
  const message =
    typeof error === "object" && error && "message" in error
      ? (error as { message?: string }).message
      : undefined;

  if (message) return message;
  if (status === 401)
    return "Votre session a expiré. Veuillez vous reconnecter.";
  if (status === 403) return "Action non autorisée.";
  if (status === 409) return "Cet email est déjà utilisé.";
  return "Impossible de mettre à jour vos informations. Veuillez réessayer.";
}

/**
 * POST /delete-user — requests account erasure. Better Auth emails a
 * confirmation link (valid 24h) to the account address; the account is only
 * anonymized once that link is opened (see /goodbye), and the request is
 * refused while other candidates still hold active applications on the
 * account's listings. The email warns about that case upfront.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await authClient.deleteUser();
  if (error) {
    throw new Error(mapDeleteAccountError(error));
  }
}

/** Maps a delete-account API error to a user-facing French message. */
function mapDeleteAccountError(error: { status?: number; message?: string }) {
  if (error.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  if (error.status === 400 && /session/i.test(error.message ?? "")) {
    return "Votre session est trop ancienne pour valider une suppression. Déconnectez-vous, reconnectez-vous, puis relancez la demande.";
  }
  return "Impossible d'envoyer la demande de suppression. Veuillez réessayer plus tard.";
}
