import { ActivityFeed } from "@/components/organisms/activity-feed";
import { DashboardGreeting } from "@/components/organisms/dashboard-greeting";
import { DashboardStats } from "@/components/organisms/dashboard-stats";
import { ProfileOnboardingCard } from "@/components/organisms/profile-onboarding-card";
import { ReactivityPanel } from "@/components/organisms/reactivity-panel";
import type { DashboardData } from "@/lib/dashboard";
import { PAGE_CONTAINER } from "@/lib/layout";

export function MemberHome({ data }: { data: DashboardData }) {
  return (
    <div className={PAGE_CONTAINER}>
      <DashboardGreeting greeting={data.greeting} actions={data.actions} />

      {data.needsProfile && (
        <div className="mt-6">
          <ProfileOnboardingCard />
        </div>
      )}

      <DashboardStats stats={data.stats} className="mt-6" />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ActivityFeed
          items={data.activity}
          title="Activité récente"
          emptyMessage="Aucune candidature pour l'instant. Parcourez les annonces ouvertes pour trouver un remplacement."
          seeAllHref="/applications"
        />

        <aside className="min-w-0">
          <ReactivityPanel
            title={data.reactivity.title}
            stats={data.reactivity.stats}
            tipTitle={data.reactivity.tipTitle}
            tip={data.reactivity.tip}
          />
        </aside>
      </div>
    </div>
  );
}
