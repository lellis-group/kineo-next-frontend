import { fetchServerAuth } from "@/lib/server-auth";
import { AppHeader } from "./app-header";

/**
 * Server loader: resolves the whole auth state in one call and streams the
 * header inside the layout's Suspense boundary.
 */
export async function AppHeaderLoader() {
  const auth = await fetchServerAuth();

  return <AppHeader initialAuth={auth} />;
}
