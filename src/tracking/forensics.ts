import { previousDay, type StreakLog } from "./streaks";

// Pure helpers behind the on-device forensics kit: the diagnostic breadcrumb
// log, the monotonic backup of the streak log, and the debug inspector screen.

export type DiagEvent = { at: string; type: string; detail: string };

export const DIAG_CAP = 300;

/** Append a breadcrumb, dropping the oldest once past the cap. */
export function appendEvent(events: DiagEvent[], event: DiagEvent, cap = DIAG_CAP): DiagEvent[] {
  const next = [...events, event];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Days at or over their locked goal. */
export function metDayCount(log: StreakLog): number {
  return Object.values(log).filter((d) => d.seconds >= d.goalSeconds).length;
}

/**
 * The backup may only ever grow: replace it when the candidate strictly gains
 * met days, so a wiped or shrunken log can never clobber the good copy.
 */
export function shouldReplaceBackup(existing: StreakLog | null, candidate: StreakLog): boolean {
  const have = existing ? metDayCount(existing) : 0;
  return metDayCount(candidate) > have;
}

/** `today` and the n-1 days before it, newest first. */
export function lastNDays(today: string, n: number): string[] {
  const days: string[] = [];
  let date = today;
  for (let i = 0; i < n; i++) {
    days.push(date);
    date = previousDay(date);
  }
  return days;
}
