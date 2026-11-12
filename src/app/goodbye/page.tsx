"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { DeletionScreen } from "@/components/organisms/deletion-screen";
import { useSession } from "@/lib/auth-client";
import { useDeletionConfirmation } from "@/lib/hooks/use-deletion-confirmation";

function GoodbyeContent() {
  const token = useSearchParams().get("token");
  const { data: session } = useSession();
  const { status, error, signedOut, retry } = useDeletionConfirmation(token);

  /** Focus target, since the whole card is replaced as the flow settles. */
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Skipped while in flight and on success: the heading doesn't change.
  useEffect(() => {
    if (status === "deleting" || status === "success") {
      return;
    }
    headingRef.current?.focus();
  }, [status]);

  return (
    <DeletionScreen
      status={status}
      error={error}
      signedOut={signedOut}
      hasSession={Boolean(session?.user)}
      onRetry={retry}
      headingRef={headingRef}
    />
  );
}

export default function GoodbyePage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <GoodbyeContent />
    </Suspense>
  );
}
