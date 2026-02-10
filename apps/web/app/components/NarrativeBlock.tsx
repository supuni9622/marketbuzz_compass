"use client";

import { NovaAvatar } from "./NovaAvatar";

export interface NarrativeBlockProps {
  /** Brief markdown or placeholder text */
  content: string;
  /** When true, show subtle "placeholder" styling */
  placeholder?: boolean;
}

/**
 * Monthly Brief narrative: Nova avatar + text. Per BRAND_AND_UI — narrative as spine.
 */
export function NarrativeBlock({ content, placeholder }: NarrativeBlockProps) {
  return (
    <section
      className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4"
      aria-label="Nova monthly brief"
    >
      <NovaAvatar />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-600">Nova</p>
        <div
          className="mt-1 whitespace-pre-wrap text-gray-800"
          style={{ fontFamily: "inherit" }}
        >
          {content}
        </div>
        {placeholder && (
          <p className="mt-2 text-xs text-gray-500">Summary pending — Nova coming soon.</p>
        )}
      </div>
    </section>
  );
}
