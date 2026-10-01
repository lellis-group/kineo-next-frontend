import { Fact, FactList } from "@/components/molecules/fact-list";
import type { ApplicationListingInfo } from "@/lib/applications";

/** Targeted-listing facts (period, remuneration) and description. */
export function ApplicationListingDetails({
  listing,
}: {
  listing: ApplicationListingInfo;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold text-foreground">L&apos;annonce</h2>

      <FactList className="mt-6">
        <Fact term="Période">
          {listing.dateRange ?? "Dates non communiquées"}
        </Fact>

        <Fact term="Rémunération">
          {listing.remuneration ?? "Non précisée"}
        </Fact>
      </FactList>

      {listing.description && (
        <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">
          {listing.description}
        </p>
      )}
    </section>
  );
}
