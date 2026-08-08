import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Today's local calendar date as "YYYY-MM-DD" (device timezone). */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Milliseconds until just past the next local midnight (DST-safe). */
function msUntilNextMidnight(now: Date): number {
  // 1s past midnight so a slightly-early timer can't fire on the old day.
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

/**
 * Today's date for rendering. Unlike a bare todayLocalDate() call, this stays
 * correct across midnight when the app process survives overnight: it
 * re-derives the date whenever the app returns to the foreground, and on a
 * timer at midnight while it stays open.
 */
export function useTodayLocalDate(): string {
  const [today, setToday] = useState(() => todayLocalDate());

  useEffect(() => {
    const refresh = () => setToday(todayLocalDate());

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    let timer: ReturnType<typeof setTimeout>;
    const scheduleRollover = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleRollover();
      }, msUntilNextMidnight(new Date()));
    };
    scheduleRollover();

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);

  return today;
}
