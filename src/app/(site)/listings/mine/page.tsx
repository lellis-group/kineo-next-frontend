import type { Metadata } from "next";
import { Suspense } from "react";
import { MyListingsSkeleton } from "@/components/molecules/my-listings-skeleton";
import { MyListingsContainer } from "@/components/templates/my-listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyListings } from "@/lib/listings";
import { clampPageSize, MY_LISTINGS_PAGE_SIZE_CHOICES } from "@/lib/page-size";
import { readServerPageSize } from "@/lib/page-size.server";
import { requireMember } from "@/lib/require-member";

export const metadata: Metadata = {
  title: "Mes offres — Kineo",
  description:
    "Gérez vos annonces de remplacement et les candidatures que vous recevez : présélectionnez, acceptez ou refusez.",
};

export default function MyListingsPage() {
  return (
    <Suspense fallback={<MyListingsSkeleton />}>
      <MyListings />
    </Suspense>
  );
}

async function MyListings() {
  // Seeded at the reader's chosen size, clamped to this screen's list.
  const pageSize = clampPageSize(
    await readServerPageSize(),
    MY_LISTINGS_PAGE_SIZE_CHOICES,
  );

  const data = await requireMember(
    fetchMyListings({ limit: pageSize }, serverTransport),
  );
  return <MyListingsContainer initialData={data} initialPageSize={pageSize} />;
}
