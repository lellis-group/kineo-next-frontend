import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/molecules/list-skeleton";
import { MyListingsContainer } from "@/components/templates/my-listings-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyListings } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Mes offres — Kineo",
  description:
    "Gérez vos annonces de remplacement et les candidatures que vous recevez : présélectionnez, acceptez ou refusez.",
};

/** Matches the placeholder's rhythm in `ListSkeleton`. */
const SKELETON_CHIPS = 5;

export default function MyListingsPage() {
  return (
    <Suspense
      fallback={<ListSkeleton chipCount={SKELETON_CHIPS} cardHeight="h-52" />}
    >
      <MyListings />
    </Suspense>
  );
}

async function MyListings() {
  const data = await fetchMyListings({}, serverTransport);
  return <MyListingsContainer initialData={data} />;
}
