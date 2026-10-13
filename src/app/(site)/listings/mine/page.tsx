import type { Metadata } from "next";
import { Suspense } from "react";
import { MyListingsSkeleton } from "@/components/molecules/my-listings-skeleton";
import { MyListingsContainer } from "@/components/templates/my-listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyListings, MY_LISTINGS_PAGE_SIZE } from "@/lib/listings";
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
  const data = await requireMember(
    fetchMyListings({ limit: MY_LISTINGS_PAGE_SIZE }, serverTransport),
  );
  return <MyListingsContainer initialData={data} />;
}
