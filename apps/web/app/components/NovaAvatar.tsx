"use client";

import Image from "next/image";

const SIZE = 56;

/**
 * Nova avatar for the narrative block. Uses transparent background so it sits on any UI.
 * Parent adds .nova-updating to trigger gentle pulse when loading (see NarrativeBlock).
 * @see docs/BRAND_AND_UI.md § Avatar Usage, Nova Animations
 */
export function NovaAvatar() {
  return (
    <div className="nova-avatar-wrapper flex-shrink-0 rounded-full" aria-hidden>
      <Image
        src="/nova_avatar_transparent_bg.png"
        alt="Nova, your revenue analyst"
        width={SIZE}
        height={SIZE}
        className="rounded-full"
        priority
      />
    </div>
  );
}
