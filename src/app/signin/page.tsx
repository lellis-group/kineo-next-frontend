import type { Metadata } from "next";
import { SignInContainer } from "@/components/templates/signin-container";

export const metadata: Metadata = {
  title: "Connexion — Kineo",
  description:
    "Connectez-vous à votre console Kineo pour candidater, publier vos annonces et suivre vos candidatures.",
};

/**
 * Metadata and nothing else: the form, its validation and its two failure paths
 * live in `signin-container` / `signin-view`, like every other screen here.
 */
export default function SignInPage() {
  return <SignInContainer />;
}
