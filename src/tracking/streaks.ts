/** Optional rep goals bolted onto the daily goal: exercise id -> reps needed. */
export type RepTargets = Record<string, number>;
/** Reps actually done, by exercise id. Mirrors one day of the exercise log. */
export type DayReps = Record<string, number>;
/** Reps done per day — the exercise log, as this module needs to read it. */
export type RepsByDate = Record<string, DayReps>;

export type DayLog = { seconds: number; goalSeconds: number; repTargets?: RepTargets };
export type StreakLog = Record<string, DayLog>; // key: "YYYY-MM-DD" (local date)

/** The "YYYY-MM-DD" calendar day before `date`. Pure string math, no real time. */
export function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/** Every rep target the day was logged under is satisfied by the reps done. */
function targetsMet(targets: RepTargets | undefined, reps: DayReps | undefined): boolean {
  if (!targets) return true;
  return Object.entries(targets).every(([id, target]) => (reps?.[id] ?? 0) >= target);
}

/**
 * A day is met once its stretched seconds reach the goal it was logged under
 * AND every rep target locked onto it was hit. All parts are required — a day
 * of push-ups with no stretching (or the reverse) does not carry the streak.
 * Days logged before targets existed carry none, so history is judged on time
 * alone.
 */
function isMet(day: DayLog | undefined, reps?: DayReps): boolean {
  return day != null && day.seconds >= day.goalSeconds && targetsMet(day.repTargets, reps);
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
  goalSeconds: number,
  repTargets: RepTargets = {}
): StreakLog {
  const existing = log[date];
  const targets = existing?.repTargets ?? (Object.keys(repTargets).length > 0 ? repTargets : undefined);
  return {
    ...log,
    [date]: {
      seconds: (existing?.seconds ?? 0) + seconds,
      goalSeconds: existing?.goalSeconds ?? goalSeconds,
      ...(targets ? { repTargets: targets } : {}),
    },
  };
}

/**
 * Consecutive met days ending at `today`. Today is "in progress": if it hasn't
 * reached goal yet it doesn't extend the streak, but it doesn't break it either
 * — we count back from yesterday. A fully missed past day ends the streak.
 */
export function currentStreak(log: StreakLog, today: string, reps: RepsByDate = {}): number {
  let date = isMet(log[today], reps[today]) ? today : previousDay(today);
  let count = 0;
  while (isMet(log[date], reps[date])) {
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
export function updateDayGoal(
  log: StreakLog,
  date: string,
  goalSeconds: number,
  repTargets: RepTargets = {}
): StreakLog {
  const day = log[date];
  if (!day) return log;
  const targets = Object.keys(repTargets).length > 0 ? repTargets : undefined;
  const sameTargets = JSON.stringify(day.repTargets ?? null) === JSON.stringify(targets ?? null);
  if (day.goalSeconds === goalSeconds && sameTargets) return log;
  return {
    ...log,
    [date]: { seconds: day.seconds, goalSeconds, ...(targets ? { repTargets: targets } : {}) },
  };
}

/** One exercise target's standing today. */
export type PartProgress = { exerciseId: string; reps: number; target: number; met: boolean };

export type TodayProgress = {
  seconds: number;
  goalSeconds: number;
  fraction: number; // true stretch-time progress, clamped 0..1
  ring: number; // what the ring should draw: closes ONLY when the whole day is met
  timeMet: boolean; // the stretching part alone
  met: boolean; // stretching AND every rep target
  parts: PartProgress[]; // one per rep target, in id order
};

// An unmet day never draws past this, so the ring always shows a visible gap.
// Without it, 1185/1200 (98.75%) rendered as a closed ring on the tiny header
// ring — the user read "goal met", stopped 15s short, and the streak broke
// overnight (the Aug 13 2026 incident).
const UNMET_RING_CAP = 0.92;

/**
 * Today's progress for the ring. Uses the day's locked goal if it already has
 * sessions, otherwise the current goal setting (so an untouched day shows the
 * live goal).
 */
export function todayProgress(
  log: StreakLog,
  today: string,
  currentGoalSeconds: number,
  currentTargets: RepTargets = {},
  todayReps: DayReps = {}
): TodayProgress {
  const day = log[today];
  const seconds = day?.seconds ?? 0;
  const goalSeconds = day?.goalSeconds ?? currentGoalSeconds;
  const targets = day?.repTargets ?? currentTargets;
  const timeMet = seconds >= goalSeconds;
  const parts: PartProgress[] = Object.keys(targets)
    .sort()
    .map((exerciseId) => {
      const reps = todayReps[exerciseId] ?? 0;
      return { exerciseId, reps, target: targets[exerciseId], met: reps >= targets[exerciseId] };
    });
  const met = timeMet && parts.every((p) => p.met);
  const fraction = goalSeconds > 0 ? Math.min(1, seconds / goalSeconds) : 1;
  // The fill still means stretch time — but an unmet day never closes, so a
  // finished 15 minutes with push-ups still owed keeps its visible gap.
  const ring = met ? 1 : Math.min(fraction, UNMET_RING_CAP);
  return { seconds, goalSeconds, fraction, ring, timeMet, met, parts };
}

/** The longest run of consecutive met days anywhere in the log. */
export function longestStreak(log: StreakLog, reps: RepsByDate = {}): number {
  const metDays = Object.keys(log)
    .filter((d) => isMet(log[d], reps[d]))
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
