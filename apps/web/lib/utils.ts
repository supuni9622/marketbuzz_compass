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
