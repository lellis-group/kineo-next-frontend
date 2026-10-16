import type { Metadata } from "next";
import { Suspense } from "react";
import { MyListingsSkeleton } from "@/components/molecules/my-listings-skeleton";
import { MyListingsContainer } from "@/components/templates/my-listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyListings } from "@/lib/listings";
import { readServerPageSize } from "@/lib/page-size.server";
import { requireMember } from "@/lib/require-member";

export const metadata: Metadata = {
  title: "Mes offres — Kineo",
  description:
    "Gérez vos annonces de remplacement et les candidatures que vous recevez : présélectionnez, acceptez ou refusez.",
};

export default function MyListingsPage() {
  return (
    // The workspace's own shape, so the first streaming block is the board the
    // reader lands on rather than a stacked list that then rearranges itself.
    <Suspense fallback={<MyListingsSkeleton />}>
      <MyListings />
    </Suspense>
  );
}

async function MyListings() {
  // Seeded at the size the reader chose, so the cold load is the page they are
  // coming back to rather than the default one they then have to grow into.
  const pageSize = await readServerPageSize();

  const data = await requireMember(
    fetchMyListings({ limit: pageSize }, serverTransport),
  );
  return <MyListingsContainer initialData={data} initialPageSize={pageSize} />;
}
