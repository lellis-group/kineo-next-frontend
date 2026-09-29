import type { Metadata } from "next";
import { MyListingsContainer } from "@/components/templates/my-listings-container";

export const metadata: Metadata = {
  title: "Mes offres — Kineo",
  description:
    "Gérez vos annonces de remplacement et les candidatures que vous recevez : présélectionnez, acceptez ou refusez.",
};

export default function MyListingsPage() {
  return <MyListingsContainer />;
}
