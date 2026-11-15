import { ActivityFeed } from "@/components/organisms/activity-feed";
import { DashboardGreeting } from "@/components/organisms/dashboard-greeting";
import { DashboardRail } from "@/components/organisms/dashboard-rail";
import { NextReplacementPanel } from "@/components/organisms/next-replacement-panel";
import { ProfileOnboardingCard } from "@/components/organisms/profile-onboarding-card";
import { BoardShell } from "@/components/templates/board-shell";
import type { DashboardData } from "@/lib/dashboard";

/**
 * The member's home, on the console's board: the figures down the rail, the
 * greeting, the next replacement and the latest activity beside it.
 * Unlike the workspaces it scrolls as a document.
 */
export function MemberHome({ data }: { data: DashboardData }) {
  return (
    <BoardShell
      className="lg:py-4"
      rail={
        <DashboardRail reactivity={data.reactivity} listings={data.listings} />
      }
    >
      <DashboardGreeting greeting={data.greeting} actions={data.actions} />

      {data.needsProfile && <ProfileOnboardingCard />}

      <NextReplacementPanel next={data.nextReplacement} />

      <ActivityFeed
        items={data.activity}
        title="Activité récente"
        emptyMessage="Aucune candidature pour l'instant. Parcourez les annonces ouvertes pour trouver un remplacement."
        seeAllHref="/applications"
      />
    </BoardShell>
  );
}
