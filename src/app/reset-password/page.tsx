import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ResetPasswordContainer } from "@/components/templates/reset-password-container";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Kineo",
  description: "Choisissez un nouveau mot de passe pour votre compte Kineo.",
};

/** The Suspense boundary the container's `useSearchParams` needs. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <ResetPasswordContainer />
    </Suspense>
  );
}
