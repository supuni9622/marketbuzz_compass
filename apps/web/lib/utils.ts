/**
 * Return a user-facing error message from an unknown error.
 * Use for data-fetch and mutation error display.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Strip basic markdown so TTS reads plain text (no "hash hash" or "asterisk"). */
export function stripMarkdownForTTS(md: string): string {
  return md
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[\s]*[-*]\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
