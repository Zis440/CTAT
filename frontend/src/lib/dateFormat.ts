
import { format, parseISO } from "date-fns";

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "d/M/yyyy, h:mm a");
  } catch (e) {
    return "Invalid Date";
  }
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "d/M/yyyy");
  } catch (e) {
    return "Invalid Date";
  }
}

export function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "h:mm a");
  } catch (e) {
    return "Invalid Time";
  }
}
