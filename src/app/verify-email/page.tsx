import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { VerifyEmailContainer } from "@/components/templates/verify-email-container";

export const metadata: Metadata = {
  title: "Vérification de l'adresse e-mail — Kineo",
  description: "Validez votre adresse e-mail pour activer votre compte Kineo.",
  robots: { index: false },
};

/** The Suspense boundary is the route's only job left: the token is a search param. */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <VerifyEmailContainer />
    </Suspense>
  );
}
