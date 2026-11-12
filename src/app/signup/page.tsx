import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { SignUpContainer } from "@/components/templates/signup-container";
import { EMAIL_MAX_LENGTH } from "@/lib/auth-validation";

/**
 * `?email=` arrives from the landing page's plain GET form. Read behind a
 * Suspense boundary so the shell stays static.
 */
export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <SignUpFromQuery searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpFromQuery({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <SignUpContainer prefillEmail={sanitizeEmail(email)} />;
}

/** Only a plausible address is echoed back into the field. */
function sanitizeEmail(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH
    ? trimmed
    : undefined;
}
