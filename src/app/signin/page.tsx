import type { Metadata } from "next";
import { SignInContainer } from "@/components/templates/signin-container";

export const metadata: Metadata = {
  title: "Connexion — Kineo",
  description:
    "Connectez-vous à votre console Kineo pour candidater, publier vos annonces et suivre vos candidatures.",
};

export default function SignInPage() {
  return <SignInContainer />;
}
