"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { DeletionScreen } from "@/components/molecules/deletion-screen";
import { LoadingState } from "@/components/molecules/loading-state";
import { useSession } from "@/lib/auth-client";
import { useDeletionConfirmation } from "@/lib/hooks/use-deletion-confirmation";

function GoodbyeContent() {
  const token = useSearchParams().get("token");
  const { data: session } = useSession();
  const { status, error, signedOut, retry } = useDeletionConfirmation(token);

  /**
   * Focus target: the card's heading. The whole card is replaced as the flow
   * settles, so without this a keyboard user is left tabbing back through
   * whatever was on the page before.
   */
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Skipped while the request is in flight and on the way to success: both keep
  // the same heading on screen, and moving focus mid-flight would interrupt
  // whatever the reader was doing.
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
