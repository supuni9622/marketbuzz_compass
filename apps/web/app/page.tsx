"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "./components/AppHeader";
import { AppTabs } from "./components/AppTabs";
import { KpiStrip } from "./components/KpiStrip";
import { BriefSection } from "./components/BriefSection";
import { Scorecards } from "./components/Scorecards";
import { ActionCenterTables } from "./components/ActionCenterTables";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  reduced: { opacity: 1 },
};

export default function Home() {
  const reduceMotion = useReducedMotion();
  const sectionVariants = reduceMotion ? { hidden: fadeIn.reduced, visible: fadeIn.reduced } : fadeIn;

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/50 to-slate-50/80 dark:from-slate-900 dark:to-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <AppHeader />
        <AppTabs />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <KpiStrip />
        </motion.div>
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <BriefSection />
        </motion.div>
        <Scorecards />
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <ActionCenterTables />
        </motion.div>
      </div>
    </main>
  );
}
