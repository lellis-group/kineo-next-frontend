import { fetchServerProfileType } from "@/lib/server-profile";
import { fetchServerSession } from "@/lib/server-session";
import { AppHeader } from "./app-header";

/** Server loader: role for nav, streamed inside Suspense. */
export async function AppHeaderLoader() {
  const [session, profileType] = await Promise.all([
    fetchServerSession(),
    fetchServerProfileType(),
  ]);

  return <AppHeader initialProfileType={session ? profileType : null} />;
}
