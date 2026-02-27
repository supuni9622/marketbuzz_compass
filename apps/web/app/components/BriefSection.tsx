"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthProvider";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage, stripMarkdownForTTS } from "@/lib/utils";
import { useFilters } from "@/app/hooks/useFilters";
import { NarrativeBlock } from "./NarrativeBlock";
import { NovaExplainer } from "./NovaExplainer";
import { NovaAvatar } from "./NovaAvatar";

interface BriefResponse {
  month: string;
  brief_markdown: string;
  placeholder: boolean;
}

export function BriefSection() {
  const { isLoading: authLoading } = useAuth();
  const api = useApiClient();
  const { monthApi } = useFilters();
  const [hasNewContent, setHasNewContent] = useState(false);
  const prevPlaceholderRef = useRef<boolean | null>(null);
  /** When true, show video (Nova) instead of static image; set on "Speak summary". */
  const [showVideo, setShowVideo] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["brief", monthApi],
    queryFn: () => api.get<BriefResponse>("/brief", { month: monthApi }),
    enabled: !authLoading,
  });

  const placeholder = data?.placeholder ?? true;
  const content = placeholder ? "" : (data?.brief_markdown ?? "");

  useEffect(() => {
    if (isLoading) return;
    const wasPlaceholder = prevPlaceholderRef.current;
    prevPlaceholderRef.current = placeholder;
    if ((wasPlaceholder === true || wasPlaceholder === null) && !placeholder) {
      setHasNewContent(true);
      const t = setTimeout(() => setHasNewContent(false), 700);
      return () => clearTimeout(t);
    }
  }, [isLoading, placeholder]);

  const handleSpeakSummary = useCallback(async () => {
    const text = content?.trim();
    if (!text) return;
    setSpeakError(null);
    setShowVideo(true);
    setSpeaking(true);
    try {
      const textForTts = stripMarkdownForTTS(content);
      if (!textForTts.trim()) {
        setSpeakError("No content to read");
        setSpeaking(false);
        return;
      }
      const blob = await api.postBlob("/nova/speech", { text: textForTts });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      const onEnd = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setSpeaking(false);
      };
      audio.addEventListener("ended", onEnd);
      audio.addEventListener("error", onEnd);
      await audio.play();
    } catch (err) {
      setSpeakError(err instanceof Error ? err.message : "Speech failed");
      setSpeaking(false);
    }
  }, [content, api]);

  const handleStopSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  if (authLoading || isLoading) {
    return (
      <section className="mt-6" aria-label="Monthly Brief loading">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MarketBuzz Monthly Brief</h2>
        <div className="mt-4 flex flex-wrap items-stretch gap-6">
          <div className="flex flex-col items-center">
            <NovaAvatar size={200} withBg />
            <p className="mt-1.5 max-w-[200px] text-center text-xs text-slate-500 dark:text-slate-400">
              Nova presents this month&apos;s brief
            </p>
          </div>
          <div className="min-h-[200px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-md dark:border-slate-600 dark:from-slate-800/80 dark:to-slate-800">
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Hello, I&apos;m nova.</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Your revenue analyst, I watch the numbers so you don&apos;t have to.
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
              Loading summary…
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6" aria-label="Monthly Brief error">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
          Failed to load brief. {getErrorMessage(error)}
        </div>
      </section>
    );
  }

  const hasSummaryToSpeak = !placeholder && content.trim().length > 0;

  return (
    <section className="mt-6" aria-label="Monthly Brief">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MarketBuzz Monthly Brief</h2>
      {speakError && (
        <div
          className="mt-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          role="alert"
        >
          <span>{speakError}</span>
          <button
            type="button"
            onClick={() => setSpeakError(null)}
            className="rounded px-2 py-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-800/50"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-stretch gap-6">
        {/* Image first; on "Speak summary" switch to video */}
        {showVideo ? (
          <NovaExplainer variant="video" size="lg" caption="Nova presents this month's brief" />
        ) : (
          <div className="flex flex-col items-center">
            <NovaAvatar size={200} withBg />
            <p className="mt-1.5 max-w-[200px] text-center text-xs text-slate-500 dark:text-slate-400">
              Nova presents this month&apos;s brief
            </p>
          </div>
        )}
        <div className="min-h-[200px] min-w-0 flex-1">
          <NarrativeBlock
            className="h-full min-h-full"
            content={content}
            placeholder={placeholder}
            isUpdating={isLoading}
            hasNewContent={hasNewContent}
            showAvatar={false}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasSummaryToSpeak && (
          speaking ? (
            <button
              type="button"
              onClick={handleStopSpeak}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 shadow-sm hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-800/50"
              aria-label="Stop speech"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSpeakSummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30"
              title="Listen to Nova read the summary (AI voice)"
              aria-label="Speak summary"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 8.077 11 7.536 11 7V5a1 1 0 012 0v2c0 .536.077 1.077.293 1.586L15.536 15zM19 11a8 8 0 01-8 8" />
              </svg>
              Speak summary
            </button>
          )
        )}
        <a
          href="#action-center"
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30"
        >
          Show evidence
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
        <Link
          href="/growth-plan"
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-slate-800"
        >
          Generate growth plan
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
