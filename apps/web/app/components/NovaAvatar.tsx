"use client";

import Image from "next/image";

const DEFAULT_SIZE = 56;

/**
 * Nova avatar for the narrative block and chat. Uses transparent or with-bg image.
 * Parent adds .nova-updating to trigger gentle pulse when loading (see NarrativeBlock).
 * @see docs/BRAND_AND_UI.md § Avatar Usage, Nova Animations
 */
export interface NovaAvatarProps {
  /** Size in pixels (default 56). */
  size?: number;
  /** Use avatar with background for more presence (e.g. chat empty state). */
  withBg?: boolean;
  className?: string;
}

export function NovaAvatar({ size = DEFAULT_SIZE, withBg = false, className = "" }: NovaAvatarProps) {
  const src = withBg ? "/nova_avatar_with_bg.png" : "/nova_avatar_transparent_bg.png";
  return (
    <div
      className={`nova-avatar-wrapper flex-shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={src}
        alt="Nova, your revenue analyst"
        width={size}
        height={size}
        className="rounded-full object-cover"
        priority
      />
    </div>
  );
}
