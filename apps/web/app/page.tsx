"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "./components/AppHeader";
import { AppTabs } from "./components/AppTabs";
import { KpiStrip } from "./components/KpiStrip";
import { BriefSection } from "./components/BriefSection";
import { Scorecards, ScorecardsGridSkeleton } from "./components/Scorecards";
import { ActionCenterTables } from "./components/ActionCenterTables";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  reduced: { opacity: 1 },
};

function KpiStripFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="KPI strip loading">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700" />
      ))}
    </div>
  );
}

function BriefFallback() {
  return (
    <section className="mt-6" aria-label="Monthly Brief loading">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MarketBuzz Monthly Brief</h2>
      <div className="mt-4 h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
    </section>
  );
}

function ScorecardsSectionWithFallback() {
  return (
    <section className="mt-8" aria-label="Scorecards">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Scorecards</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Last 12 months trend (sparkline). Expand for by-app breakdown.</p>
      <Suspense fallback={<ScorecardsGridSkeleton />}>
        <Scorecards showHeading={false} />
      </Suspense>
    </section>
  );
}

function ActionCenterFallback() {
  return (
    <section className="mt-8" aria-label="Action Center loading">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Action Center</h2>
      <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
    </section>
  );
}

function FullDashboardSkeleton() {
  return (
    <>
      <KpiStripFallback />
      <BriefFallback />
      <section className="mt-8" aria-label="Scorecards loading">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Scorecards</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Loading metrics…</p>
        <ScorecardsGridSkeleton />
      </section>
      <ActionCenterFallback />
    </>
  );
}

function DashboardContent() {
  const reduceMotion = useReducedMotion();
  const sectionVariants = reduceMotion ? { hidden: fadeIn.reduced, visible: fadeIn.reduced } : fadeIn;

  return (
    <>
      <motion.div variants={sectionVariants} initial="hidden" animate="visible">
        <Suspense fallback={<KpiStripFallback />}>
          <KpiStrip />
        </Suspense>
      </motion.div>
      <motion.div variants={sectionVariants} initial="hidden" animate="visible">
        <Suspense fallback={<BriefFallback />}>
          <BriefSection />
        </Suspense>
      </motion.div>
      <ScorecardsSectionWithFallback />
      <motion.div variants={sectionVariants} initial="hidden" animate="visible">
        <Suspense fallback={<ActionCenterFallback />}>
          <ActionCenterTables />
        </Suspense>
      </motion.div>
    </>
  );
}

function DashboardOrSkeleton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <FullDashboardSkeleton />;
  }
  return <DashboardContent />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/50 to-slate-50/80 dark:from-slate-900 dark:to-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <AppHeader />
        <AppTabs />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <DashboardOrSkeleton />
      </div>
    </main>
  );
}
