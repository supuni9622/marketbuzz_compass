"use client";

interface UserAvatarProps {
  size?: number;
  className?: string;
}

/**
 * User avatar for chat: "You" initials in a teal circle.
 */
export function UserAvatar({ size = 40, className = "" }: UserAvatarProps) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {size <= 36 ? "Y" : "You"}
    </div>
  );
}
