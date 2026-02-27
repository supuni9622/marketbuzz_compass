"use client";

import { NovaAvatar } from "./NovaAvatar";

export interface NarrativeBlockProps {
  /** Brief markdown or placeholder text */
  content: string;
  /** When true, show subtle "placeholder" styling */
  placeholder?: boolean;
  /** When true, show "Nova is updating" pulse on avatar (loading/refetch) */
  isUpdating?: boolean;
  /** When true, briefly highlight the text block (new content just loaded) */
  hasNewContent?: boolean;
  /** When false, hide the small avatar (e.g. when brief uses only the large Nova image). Default true. */
  showAvatar?: boolean;
  /** Optional class for the root section (e.g. min-height to match adjacent column). */
  className?: string;
}

/**
 * Monthly Brief narrative: Nova avatar + text. Per BRAND_AND_UI — narrative as spine.
 * Animations: entrance (fade-in), updating (pulse), new content (highlight); respect prefers-reduced-motion.
 */
export function NarrativeBlock({
  content,
  placeholder,
  isUpdating,
  hasNewContent,
  showAvatar = true,
  className: sectionClassName,
}: NarrativeBlockProps) {
  return (
    <section
      className={`nova-entrance flex gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-md dark:border-slate-600 dark:from-slate-800/80 dark:to-slate-800 ${isUpdating ? "nova-updating" : ""} ${sectionClassName ?? ""}`.trim()}
      aria-label="Nova monthly brief"
    >
      {showAvatar && <NovaAvatar />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Hello, I&apos;m nova.</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Your revenue analyst, I watch the numbers so you don&apos;t have to.
        </p>
        <div
          className={`mt-1.5 rounded px-1 py-0.5 whitespace-pre-wrap text-slate-800 dark:text-slate-200 ${hasNewContent ? "nova-new-content-block" : ""}`}
          style={{ fontFamily: "inherit" }}
        >
          {content}
        </div>
        {placeholder && (
          <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-600 dark:text-slate-300">No brief for this month yet.</p>
            <p>An admin can generate one from Admin → Uploads (e.g. after a CSV run, use “Retry Nova” on a run, or trigger brief generation for the selected month).</p>
          </div>
        )}
      </div>
    </section>
  );
}
