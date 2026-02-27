"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/app/auth/AuthProvider";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";
import { getErrorMessage, stripMarkdownForTTS } from "@/lib/utils";
import Link from "next/link";
import { TrendSparkline } from "./TrendSparkline";
import { ByAppBarChart } from "./ByAppBarChart";
import { NovaAvatar } from "./NovaAvatar";

interface NovaChatResponse {
  message: string;
  tool_calls_used: number;
}

type ScorecardCardKey = "billed" | "active" | "collected" | "deposited" | "nra" | "refunded";

interface ListenCard {
  key: ScorecardCardKey;
  askNovaQuestion: string;
}

interface MetricWithCompare {
  current: number;
  compare: number;
  delta: number;
  delta_pct: number | null;
}

interface KpisResponse {
  month: string;
  compare_month: string;
  billed_amount: MetricWithCompare;
  collected_amount: MetricWithCompare;
  deposited_amount: MetricWithCompare;
  nra_amount: MetricWithCompare;
  active_merchants: MetricWithCompare;
  refunded_amount: MetricWithCompare;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function DeltaBadge({ delta, deltaPct }: { delta: number; deltaPct: number | null }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;
  const pctStr = deltaPct != null ? `${isPositive ? "+" : ""}${deltaPct}%` : "";
  if (isZero) return <span className="text-slate-500 dark:text-slate-400">—</span>;
  const colorClass = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  return <span className={colorClass}>{pctStr}</span>;
}

const SCORECARDS_SECTION_CLASS = "mt-8";
const SCORECARDS_HEADING = "Scorecards";
const SCORECARDS_DESCRIPTION = "Last 12 months trend (sparkline). Expand for by-app breakdown.";

export function ScorecardsGridSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-600 dark:bg-slate-700" />
      ))}
    </div>
  );
}

export function Scorecards({ showHeading = true }: { showHeading?: boolean }) {
  const { isLoading: authLoading } = useAuth();
  const api = useApiClient();
  const { monthApi, compareMonthApi, appId } = useFilters();
  const reduceMotion = useReducedMotion();

  const { data, error } = useQuery({
    queryKey: ["kpis", monthApi, compareMonthApi, appId],
    queryFn: () => {
      const params: Record<string, string> = { month: monthApi, compare_month: compareMonthApi };
      if (appId) params.app_id = appId;
      return api.get<KpisResponse>("/metrics/kpis", params);
    },
    enabled: !authLoading,
  });

  const [expandedCard, setExpandedCard] = useState<"billed" | "active" | "collected" | "deposited" | "nra" | "refunded" | null>(null);
  const [audioCardKey, setAudioCardKey] = useState<typeof expandedCard>(null);
  const [audioStatus, setAudioStatus] = useState<"loading" | "playing" | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleListen = useCallback(
    async (card: ListenCard) => {
      setAudioCardKey(card.key);
      setAudioStatus("loading");
      setAudioError(null);
      try {
        const body: {
          messages: { role: "user"; content: string }[];
          month?: string;
          compare_month?: string;
          app_id?: string;
        } = { messages: [{ role: "user", content: card.askNovaQuestion }] };
        if (monthApi) body.month = monthApi;
        if (compareMonthApi) body.compare_month = compareMonthApi;
        if (appId) body.app_id = appId;
        const chatRes = await api.post<NovaChatResponse>("/nova/chat", body);
        const textForTts = stripMarkdownForTTS(chatRes.message);
        if (!textForTts.trim()) {
          setAudioError("No content to read");
          setAudioCardKey(null);
          setAudioStatus(null);
          return;
        }
        const blob = await api.postBlob("/nova/speech", { text: textForTts });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        const onEnd = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setAudioCardKey(null);
          setAudioStatus(null);
        };
        audio.addEventListener("ended", onEnd);
        audio.addEventListener("error", onEnd);
        setAudioStatus("playing");
        await audio.play();
      } catch (err) {
        setAudioError(err instanceof Error ? err.message : "Audio failed");
        setAudioCardKey(null);
        setAudioStatus(null);
      }
    },
    [api, monthApi, compareMonthApi, appId]
  );

  const handleStopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioCardKey(null);
    setAudioStatus(null);
  }, []);

  const hasData = data != null && !error;
  const showSkeleton = !hasData;

  const wrap = (content: ReactNode) =>
    showHeading ? (
      <section className={SCORECARDS_SECTION_CLASS} aria-label="Scorecards">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{SCORECARDS_HEADING}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{SCORECARDS_DESCRIPTION}</p>
        {content}
      </section>
    ) : (
      content
    );

  if (error) {
    return wrap(
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }

  if (showSkeleton) {
    return wrap(<ScorecardsGridSkeleton />);
  }

  const { billed_amount, collected_amount, deposited_amount, active_merchants, refunded_amount } = data;
  const nra_amount = data.nra_amount ?? { current: 0, compare: 0, delta: 0, delta_pct: null };
  const cards = [
    {
      key: "billed" as const,
      title: "Gross Billed",
      value: formatCurrency(billed_amount.current),
      delta: billed_amount.delta,
      deltaPct: billed_amount.delta_pct,
      trendMetric: "billed_amount" as const,
      byAppKey: "billed_amount" as const,
      formatByApp: formatCurrency,
      askNovaQuestion:
        "Explain about gross billed amount over the last few months. What are the trends, drivers, and any suggestions?",
    },
    {
      key: "active" as const,
      title: "Active Merchants",
      value: formatNumber(active_merchants.current),
      delta: active_merchants.delta,
      deltaPct: active_merchants.delta_pct,
      trendMetric: "active_merchants" as const,
      byAppKey: "active_merchants" as const,
      formatByApp: formatNumber,
      askNovaQuestion:
        "Explain about active merchants count over the last few months. What are the trends and suggestions?",
    },
    {
      key: "collected" as const,
      title: "Collected",
      value: formatCurrency(collected_amount.current),
      delta: collected_amount.delta,
      deltaPct: collected_amount.delta_pct,
      trendMetric: "collected_amount" as const,
      byAppKey: "collected_amount" as const,
      formatByApp: formatCurrency,
      askNovaQuestion:
        "Explain about collected amount over the last few months. What are the trends and suggestions?",
    },
    {
      key: "deposited" as const,
      title: "Deposited",
      value: formatCurrency(deposited_amount.current),
      delta: deposited_amount.delta,
      deltaPct: deposited_amount.delta_pct,
      trendMetric: "deposited_amount" as const,
      byAppKey: "deposited_amount" as const,
      formatByApp: formatCurrency,
      askNovaQuestion:
        "Explain about deposited amount over the last few months. What are the trends and suggestions?",
    },
    {
      key: "nra" as const,
      title: "NRA (New Revenue)",
      value: formatCurrency(nra_amount.current),
      delta: nra_amount.delta,
      deltaPct: nra_amount.delta_pct,
      trendMetric: "nra_amount" as const,
      byAppKey: "nra_amount" as const,
      formatByApp: formatCurrency,
      askNovaQuestion:
        "Explain about new revenue (NRA) over the last few months. What are the trends and suggestions?",
    },
    {
      key: "refunded" as const,
      title: "Refunded",
      value: formatCurrency(refunded_amount.current),
      delta: refunded_amount.delta,
      deltaPct: refunded_amount.delta_pct,
      trendMetric: "refunded_amount" as const,
      byAppKey: "refunded_amount" as const,
      formatByApp: formatCurrency,
      askNovaQuestion:
        "Explain about refunded amount over the last few months. What are the trends and suggestions?",
    },
  ];

  const evidenceVariants = reduceMotion
    ? { open: { opacity: 1 }, closed: { opacity: 0, height: 0 } }
    : {
        open: { opacity: 1, height: "auto" },
        closed: { opacity: 0, height: 0 },
      };

  const grid = (
    <>
      {audioError && (
        <div
          className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          role="alert"
        >
          <span>{audioError}</span>
          <button
            type="button"
            onClick={() => setAudioError(null)}
            className="rounded px-2 py-0.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/50"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {/* Upper right: Ask Nova (text) + Listen (audio) */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <Link
              href={`/ask?q=${encodeURIComponent(card.askNovaQuestion)}`}
              className="flex flex-col items-center gap-0.5 px-1 py-1 text-center text-xs font-medium text-teal-700 transition hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:text-teal-300 dark:hover:text-teal-200"
              title={`Ask Nova to explain ${card.title} data`}
              aria-label={`Ask Nova to explain ${card.title} data`}
            >
              <NovaAvatar size={28} className="flex-shrink-0" />
              <span className="leading-tight max-w-[72px]">Ask Nova: {card.title}</span>
              <svg className="h-3 w-3 flex-shrink-0 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            {audioCardKey === card.key ? (
              <button
                type="button"
                onClick={handleStopAudio}
                className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 shadow-sm hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-800/50"
                title="Stop playback"
                aria-label="Stop audio"
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {audioStatus === "loading" ? "Preparing…" : "Stop"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleListen(card)}
                className="flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-2 py-1 text-xs font-medium text-teal-700 shadow-sm hover:border-teal-300 hover:bg-teal-50 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30"
                title={`Listen: Nova explains ${card.title} in audio`}
                aria-label={`Listen to Nova explain ${card.title}`}
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 8.077 11 7.536 11 7V5a1 1 0 012 0v2c0 .536.077 1.077.293 1.586L15.536 15zM19 11a8 8 0 01-8 8" />
                </svg>
                <span>Listen</span>
              </button>
            )}
          </div>

          {/* Main content unchanged: title, value, delta, sparkline, Show evidence, evidence area */}
          <p className="pr-20 text-sm font-medium text-slate-600 dark:text-slate-400">{card.title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
          <p className="mt-1 text-sm">
            <DeltaBadge delta={card.delta} deltaPct={card.deltaPct} />
          </p>
          <TrendSparkline metric={card.trendMetric} monthsBack={12} />
          <button
            type="button"
            onClick={() => setExpandedCard((c) => (c === card.key ? null : card.key))}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30"
          >
            {expandedCard === card.key ? "Hide evidence" : "Show evidence"}
            <svg
              className={`h-4 w-4 flex-shrink-0 text-teal-600 transition-transform dark:text-teal-400 ${expandedCard === card.key ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence initial={false}>
            {expandedCard === card.key && (
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={evidenceVariants}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                className="overflow-hidden border-t border-slate-100 pt-3 dark:border-slate-600"
              >
                <ByAppBarChart
                  month={data.month}
                  metricKey={card.byAppKey}
                  formatValue={card.formatByApp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
    </>
  );
  return wrap(grid);
}
