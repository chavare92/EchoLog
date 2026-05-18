/**
 * Centralised error translation layer.
 *
 * All raw Dataverse / Power Apps SDK errors should be passed through
 * `friendlyError()` before being shown to the user.
 */

const PATTERNS: Array<{ match: RegExp | string; message: string }> = [
  // HTTP status codes
  { match: /500/,                           message: "A server error occurred. Please try again in a moment or contact support if it persists." },
  { match: /503/,                           message: "The service is temporarily unavailable. Please wait a moment and try again." },
  { match: /401|403|unauthori[sz]ed/i,      message: "You don't have permission to perform this action." },
  { match: /404/,                           message: "The requested record could not be found. It may have been deleted or moved." },
  { match: /429/,                           message: "Too many requests. Please wait a moment before trying again." },
  // Dataverse column / constraint errors
  { match: /duplicate/i,                    message: "A record with this information already exists. Please check for duplicates." },
  { match: /required attribute/i,           message: "A required field is missing. Please fill in all mandatory fields and try again." },
  { match: /required field/i,               message: "A required field is missing. Please fill in all mandatory fields and try again." },
  { match: /privilege/i,                    message: "You don't have the required privilege to perform this operation." },
  { match: /lock/i,                         message: "The record is currently locked by another operation. Please try again shortly." },
  { match: /connection/i,                   message: "Cannot reach the server. Check your network connection and try again." },
  // Domain-specific messages
  { match: /rca.*approv/i,                  message: "RCA approval could not be completed due to a server issue. Please try again or contact support." },
  { match: /rca.*reject/i,                  message: "RCA rejection could not be saved. Please try again." },
  { match: /preventive action/i,            message: "The preventive action could not be saved. Please check all fields and try again." },
  { match: /incident.*cancel/i,             message: "The incident could not be cancelled. Please try again or contact an administrator." },
  { match: /transition/i,                   message: "This status transition is not allowed. The record may have changed — please refresh and try again." },
  // Network
  { match: /networkerror|network error/i,   message: "A network error occurred. Check your internet connection and try again." },
  { match: /timeout/i,                      message: "The request timed out. Please check your connection and try again." },
  { match: /failed to fetch/i,              message: "Cannot connect to the server. Please check your network connection." },
];

/**
 * Given any error value, returns a user-friendly string suitable for display
 * in a toast or inline error element. The original technical error is preserved
 * for console logging.
 */
export function friendlyError(error: unknown): string {
  const raw = extractMessage(error);
  for (const { match, message } of PATTERNS) {
    if (typeof match === "string" ? raw.includes(match) : match.test(raw)) {
      return message;
    }
  }
  // Fallback — generic but non-technical
  return "Something went wrong. Please try again. If the issue continues, contact support.";
}

/** Extract a raw message string from any thrown value. */
function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Log the technical error to the console (for developer debugging) while
 * returning a friendly string for the UI.
 */
export function logAndFriendly(context: string, error: unknown): string {
  console.error(`[EchoLog] ${context}:`, error);
  return friendlyError(error);
}
