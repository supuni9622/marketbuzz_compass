"use client";

import Image from "next/image";

const SIZE = 56;

/**
 * Nova avatar for the narrative block. Uses transparent background so it sits on any UI.
 * @see docs/BRAND_AND_UI.md § Avatar Usage
 */
export function NovaAvatar() {
  return (
    <Image
      src="/nova_avatar_transparent_bg.png"
      alt="Nova, your revenue analyst"
      width={SIZE}
      height={SIZE}
      className="flex-shrink-0 rounded-full"
      priority
    />
  );
}
