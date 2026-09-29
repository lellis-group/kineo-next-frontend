import { DashboardContainer } from "@/components/templates/dashboard-container";
import { PublicHome } from "@/components/templates/public-home";
import { fetchServerAuth } from "@/lib/server-auth";

/** Server-side branch: dashboard for members, marketing for anonymous. */
export default async function HomePage() {
  const auth = await fetchServerAuth();

  if (auth.status === "member") {
    return <DashboardContainer userName={auth.name} />;
  }

  return <PublicHome />;
}
