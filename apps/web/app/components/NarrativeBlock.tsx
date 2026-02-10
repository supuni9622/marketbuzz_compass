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
}: NarrativeBlockProps) {
  return (
    <section
      className={`nova-entrance flex gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-md ${isUpdating ? "nova-updating" : ""}`}
      aria-label="Nova monthly brief"
    >
      <NovaAvatar />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-teal-600">Nova</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Your revenue analyst, I watch the numbers so you don&apos;t have to.
        </p>
        <div
          className={`mt-1.5 rounded px-1 py-0.5 whitespace-pre-wrap text-slate-800 ${hasNewContent ? "nova-new-content-block" : ""}`}
          style={{ fontFamily: "inherit" }}
        >
          {content}
        </div>
        {placeholder && (
          <p className="mt-2 text-xs text-slate-500">Summary pending — Nova coming soon.</p>
        )}
      </div>
    </section>
  );
}
