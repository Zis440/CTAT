import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiBaseUrl(): string {
  let url = import.meta.env.VITE_API_BASE_URL || "/api";
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}

export function getMediaUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  const apiBase = getApiBaseUrl();
  const origin = apiBase.replace(/\/api\/?$/, "");
  
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const phoneStr = String(phone);
  if (phoneStr.length <= 4) return phoneStr;
  const firstPart = phoneStr.slice(0, 2);
  const lastPart = phoneStr.slice(-1);
  const maskedLength = phoneStr.length - 3;
  return `${firstPart}${"X".repeat(maskedLength)}${lastPart}`;
}
