import { LoadingState } from "@/components/molecules/loading-state";

/** Streaming boundary: shell streams while dynamic home resolves session. */
export default function SiteLoading() {
  return <LoadingState className="min-h-dvh" label="Chargement" />;
}
