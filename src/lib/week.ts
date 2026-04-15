/**
 * Week utilities — ensures consistent Monday-based week boundaries in UTC.
 * NFR §5.3 — store and transmit all timestamps in UTC.
 */

/**
 * Returns the Monday of the ISO week that contains `date`, at 00:00:00 UTC.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * Returns a human-readable label for a week, e.g. "14 Nis – 20 Nis 2025".
 */
export function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const year = weekStart.getUTCFullYear();
  return `${fmt(weekStart)} – ${fmt(end)} ${year}`;
}

/**
 * Returns the last N Monday dates (including current week) in ascending order.
 */
export function getLastNWeekStarts(n: number, from: Date = new Date()): Date[] {
  const current = getWeekStart(from);
  const weeks: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(d);
  }
  return weeks;
}

/**
 * ISO string (date only) for a week start, e.g. "2025-04-14".
 */
export function weekStartToISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the ISO week number (1–53) for a given date.
 * ISO 8601: week 1 contains the first Thursday of the year; weeks start on Monday.
 */
export function getISOWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // make Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // move to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
