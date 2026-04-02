import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: string = "de") {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "supported":
      return "text-emerald-600 dark:text-emerald-400";
    case "contradicted":
      return "text-red-600 dark:text-red-400";
    case "unverifiable":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export function getVerdictBg(verdict: string): string {
  switch (verdict) {
    case "supported":
      return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
    case "contradicted":
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "unverifiable":
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
    default:
      return "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800";
  }
}

export function calculateTrustScore(
  supported: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((supported / total) * 100);
}
