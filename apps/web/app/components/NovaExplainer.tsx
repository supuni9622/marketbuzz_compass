"use client";

/**
 * Nova animated explainer: GIF or looping video. Use alongside existing NovaAvatar (static images).
 * For "Nova presents" / "Ask Nova to explain" — does not replace avatar images.
 * @see public/nova.gif.gif, public/nova.mp4.mp4
 */
export interface NovaExplainerProps {
  /** "video" = muted loop autoplay (default); "gif" = img */
  variant?: "video" | "gif";
  /** Preset size (width/height in px). */
  size?: "sm" | "md" | "lg";
  /** Optional caption below the media. */
  caption?: string;
  /** Extra class for the wrapper. */
  className?: string;
  /** When true, crop to circle (rounded-full). */
  rounded?: boolean;
}

const SIZE_MAP = { sm: 64, md: 120, lg: 200 } as const;

export function NovaExplainer({
  variant = "video",
  size = "md",
  caption,
  className = "",
  rounded = false,
}: NovaExplainerProps) {
  const px = SIZE_MAP[size];
  const wrapperClass = `nova-explainer-wrapper flex flex-col items-center overflow-hidden ${rounded ? "rounded-full" : "rounded-lg"} ${className}`.trim();

  const media = (
    <div
      className={`flex-shrink-0 overflow-hidden ${rounded ? "rounded-full" : "rounded-lg"}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {variant === "video" ? (
        <video
          src="/nova.mp4.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        <img
          src="/nova.gif.gif"
          alt=""
          className="h-full w-full object-cover"
          width={px}
          height={px}
        />
      )}
    </div>
  );

  return (
    <div className={wrapperClass}>
      {media}
      {caption && (
        <p className="mt-1.5 max-w-[200px] text-center text-xs text-slate-500 dark:text-slate-400">
          {caption}
        </p>
      )}
    </div>
  );
}
