import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { SignUpContainer } from "@/components/templates/signup-container";
import { EMAIL_MAX_LENGTH } from "@/lib/auth-validation";

/**
 * `?email=` arrives from the landing page call to action, which submits a plain
 * GET form so it works before hydration.
 *
 * Reading search params opts a route out of prerendering, so the read happens
 * behind a Suspense boundary: the shell stays static and streams, and the form
 * arrives with the address already in it.
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

/**
 * Only a plausible address is echoed back into the field: `defaultValue` is
 * escaped, but there is no reason to render an arbitrary query string as the
 * starting value of the form.
 */
function sanitizeEmail(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH
    ? trimmed
    : undefined;
}
