import type { Metadata } from "next";
import { ForgotPasswordContainer } from "@/components/templates/forgot-password-container";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Kineo",
  description:
    "Recevez par e-mail un lien pour choisir un nouveau mot de passe Kineo.",
};

/** Metadata and nothing else; the three screens live in the container and view. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordContainer />;
}
