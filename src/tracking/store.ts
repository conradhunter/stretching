import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { logDiag } from "./diagStore";
import { metDayCount, shouldReplaceBackup } from "./forensics";
import { recordSeconds, updateDayGoal, type RepTargets, type StreakLog } from "./streaks";
import { todayLocalDate } from "./today";

export const TRACKING_KEY = "tracking.v1";
export const BACKUP_KEY = "tracking.v1.backup";
export const DEFAULT_GOAL_SECONDS = 15 * 60;
const MIN_GOAL_SECONDS = 60;

/**
 * The daily goal: stretched minutes, plus optional per-exercise rep targets.
 * With a target set, the day is met only when the time AND every target is hit
 * (see `isMet` in streaks.ts) — an empty `repTargets` is the plain time goal.
 */
export type Tracking = { log: StreakLog; goalSeconds: number; repTargets: RepTargets };

let state: Tracking = { log: {}, goalSeconds: DEFAULT_GOAL_SECONDS, repTargets: {} };
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function describeLog(log: StreakLog): string {
  const dates = Object.keys(log).sort();
  const last = dates[dates.length - 1];
  const tail = last ? `, last ${last}:${log[last].seconds}/${log[last].goalSeconds}s` : "";
  return `days ${dates.length}, met ${metDayCount(log)}${tail}`;
}

// Single-flight: mutators await this so a write can never race the disk load
// and persist a near-empty log over the real history. Every load is logged to
// the diag trail — a null or unparsable read here is the wipe signature.
function init(): Promise<void> {
  initPromise ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(TRACKING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Tracking>;
        state = {
          log: parsed.log ?? {},
          goalSeconds: parsed.goalSeconds ?? DEFAULT_GOAL_SECONDS,
          repTargets: parsed.repTargets ?? {},
        };
        void logDiag("init", `read ${raw.length}B, ${describeLog(state.log)}`);
        void backupIfGrown(state.log, state.goalSeconds);
      } else {
        void logDiag("init", "read null — no data on disk");
      }
    } catch (e) {
      // keep defaults on a bad read, but leave the evidence in the trail
      void logDiag("init-error", String(e));
    }
    emit();
  })();
  return initPromise;
}

// Second copy of the log, replaced only when it gains met days — a wiped or
// shrunken log can never overwrite it, so history stays recoverable.
async function backupIfGrown(log: StreakLog, goalSeconds: number) {
  try {
    const raw = await AsyncStorage.getItem(BACKUP_KEY);
    const existing = raw ? ((JSON.parse(raw) as Partial<Tracking>).log ?? null) : null;
    if (!shouldReplaceBackup(existing, log)) return;
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify({ log, goalSeconds }));
    void logDiag("backup", describeLog(log));
  } catch (e) {
    void logDiag("backup-error", String(e));
  }
}

function persist() {
  AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(state)).catch((e) => {
    void logDiag("persist-error", String(e));
  });
  void backupIfGrown(state.log, state.goalSeconds);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Log stretched seconds against today, locking today's goal on first record. */
export async function recordStretchSeconds(seconds: number) {
  const whole = Math.round(seconds);
  if (whole <= 0) return;
  await init();
  const date = todayLocalDate();
  state = {
    ...state,
    log: recordSeconds(state.log, date, whole, state.goalSeconds, state.repTargets),
  };
  const day = state.log[date];
  void logDiag("credit", `${date} +${whole}s -> ${day.seconds}/${day.goalSeconds}s`);
  emit();
  persist();
}

/**
 * Set the daily goal (in minutes). Today's ring follows immediately — the
 * in-progress day is re-locked to the new goal. Past days keep the goal they
 * were logged under.
 */
export async function setGoalMinutes(minutes: number) {
  await init();
  const goalSeconds = Math.max(MIN_GOAL_SECONDS, Math.round(minutes * 60));
  state = {
    ...state,
    goalSeconds,
    log: updateDayGoal(state.log, todayLocalDate(), goalSeconds, state.repTargets),
  };
  void logDiag("goal", `${goalSeconds}s`);
  emit();
  persist();
}

/**
 * Add or clear an exercise's daily rep target (0 clears it). Like the minutes
 * goal, the in-progress day is re-locked so today follows the live setting;
 * past days keep the targets they were logged under.
 */
export async function setExerciseTarget(exerciseId: string, reps: number) {
  await init();
  const repTargets = { ...state.repTargets };
  if (reps > 0) repTargets[exerciseId] = Math.round(reps);
  else delete repTargets[exerciseId];
  state = {
    ...state,
    repTargets,
    log: updateDayGoal(state.log, todayLocalDate(), state.goalSeconds, repTargets),
  };
  void logDiag("target", `${exerciseId} ${reps > 0 ? `${Math.round(reps)} reps` : "off"}`);
  emit();
  persist();
}

/** Subscribe to the persisted tracking state (day log + current goal). */
export function useTracking(): Tracking {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}
