export type DayLog = { seconds: number; goalSeconds: number };
export type StreakLog = Record<string, DayLog>; // key: "YYYY-MM-DD" (local date)

/** The "YYYY-MM-DD" calendar day before `date`. Pure string math, no real time. */
export function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/** A day is met once its stretched seconds reach the goal it was logged under. */
function isMet(day: DayLog | undefined): boolean {
  return day != null && day.seconds >= day.goalSeconds;
}

/**
 * Add stretched seconds to a day. The day's goal is snapshotted on its first
 * session so editing the goal later can't rewrite already-logged days; the
 * still-in-progress day is the one exception — updateDayGoal re-locks it when
 * the setting changes.
 */
export function recordSeconds(
  log: StreakLog,
  date: string,
  seconds: number,
  goalSeconds: number
): StreakLog {
  const existing = log[date];
  return {
    ...log,
    [date]: {
      seconds: (existing?.seconds ?? 0) + seconds,
      goalSeconds: existing?.goalSeconds ?? goalSeconds,
    },
  };
}

/**
 * Consecutive met days ending at `today`. Today is "in progress": if it hasn't
 * reached goal yet it doesn't extend the streak, but it doesn't break it either
 * — we count back from yesterday. A fully missed past day ends the streak.
 */
export function currentStreak(log: StreakLog, today: string): number {
  let date = isMet(log[today]) ? today : previousDay(today);
  let count = 0;
  while (isMet(log[date])) {
    count++;
    date = previousDay(date);
  }
  return count;
}

/**
 * Re-lock one day's goal to the current setting — used for the in-progress day
 * when the user edits the goal, so the ring (and tomorrow's met-judgment)
 * follow the live setting instead of the value locked at the first session.
 * No-op for days without an entry; never touches other days.
 */
export function updateDayGoal(log: StreakLog, date: string, goalSeconds: number): StreakLog {
  const day = log[date];
  if (!day || day.goalSeconds === goalSeconds) return log;
  return { ...log, [date]: { ...day, goalSeconds } };
}

export type TodayProgress = {
  seconds: number;
  goalSeconds: number;
  fraction: number; // clamped 0..1, for the ring arc
  met: boolean;
};

/**
 * Today's progress for the ring. Uses the day's locked goal if it already has
 * sessions, otherwise the current goal setting (so an untouched day shows the
 * live goal).
 */
export function todayProgress(
  log: StreakLog,
  today: string,
  currentGoalSeconds: number
): TodayProgress {
  const day = log[today];
  const seconds = day?.seconds ?? 0;
  const goalSeconds = day?.goalSeconds ?? currentGoalSeconds;
  const fraction = goalSeconds > 0 ? Math.min(1, seconds / goalSeconds) : 1;
  return { seconds, goalSeconds, fraction, met: seconds >= goalSeconds };
}

/** The longest run of consecutive met days anywhere in the log. */
export function longestStreak(log: StreakLog): number {
  const metDays = Object.keys(log)
    .filter((d) => isMet(log[d]))
    .sort(); // ISO date strings sort chronologically
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of metDays) {
    run = prev != null && previousDay(day) === prev ? run + 1 : 1;
    prev = day;
    if (run > best) best = run;
  }
  return best;
}
