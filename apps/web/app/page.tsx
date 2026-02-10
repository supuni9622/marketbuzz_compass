import { AppHeader } from "./components/AppHeader";
import { KpiStrip } from "./components/KpiStrip";
import { BriefSection } from "./components/BriefSection";
import { Scorecards } from "./components/Scorecards";
import { ActionCenterTables } from "./components/ActionCenterTables";

export default function Home() {
  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <KpiStrip />
        <BriefSection />
        <Scorecards />
        <ActionCenterTables />
      </div>
    </main>
  );
}
