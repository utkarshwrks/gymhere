import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";

/**
 * Money is stored as integer paise everywhere. Render with en-IN grouping.
 */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrNoSymbol = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** paise (integer) -> "₹1,23,456" */
export function formatMoney(paise: number, withSymbol = true): string {
  const rupees = paise / 100;
  return withSymbol ? inr.format(rupees) : inrNoSymbol.format(rupees);
}

/** rupees (number) -> paise (integer) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** paise -> rupees (number) */
export function toRupees(paise: number): number {
  return paise / 100;
}

const compactInr = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** paise -> "₹1.2L" style compact for stat cards */
export function formatMoneyCompact(paise: number): string {
  return "₹" + compactInr.format(paise / 100);
}

export function formatDate(date: Date | string, pattern = "dd MMM yyyy"): string {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

export function fromNow(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

/** Days remaining until a date (negative if past). */
export function daysUntil(date: Date | string): number {
  return differenceInCalendarDays(new Date(date), new Date());
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
