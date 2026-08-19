// ─── Date Formatting Utilities ──────────────────────────────────────────────
// Consistent date/time formatting using date-fns.

import { format, parseISO } from "date-fns";

/**
 * Format an ISO date string as "12/1/2025, 3:45 PM"
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "d/M/yyyy, h:mm a");
  } catch (e) {
    return "Invalid Date";
  }
}

/**
 * Format an ISO date string as "12/1/2025"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "d/M/yyyy");
  } catch (e) {
    return "Invalid Date";
  }
}

/**
 * Format an ISO date string as "3:45 PM"
 */
export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "h:mm a");
  } catch (e) {
    return "Invalid Time";
  }
}
