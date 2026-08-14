import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { logDiag } from "./diagStore";
import { metDayCount, shouldReplaceBackup } from "./forensics";
import { recordSeconds, updateDayGoal, type StreakLog } from "./streaks";
import { todayLocalDate } from "./today";

export const TRACKING_KEY = "tracking.v1";
export const BACKUP_KEY = "tracking.v1.backup";
export const DEFAULT_GOAL_SECONDS = 15 * 60;
const MIN_GOAL_SECONDS = 60;

export type Tracking = { log: StreakLog; goalSeconds: number };

let state: Tracking = { log: {}, goalSeconds: DEFAULT_GOAL_SECONDS };
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
    await restoreAug13();
    emit();
  })();
  return initPromise;
}

// One-time top-up of 2026-08-13: it sat at 1185/1200s — the user stretched to
// a ring that rendered 98.75% as closed and reasonably stopped, so the 15s
// shortfall is the app's fault (fixed via the unmet ring cap in streaks.ts).
// Touches only that day, never reduces anything. Delete once run on-device.
const RESTORE_MARKER = "tracking.restore-2026-08-14";

async function restoreAug13() {
  try {
    if (await AsyncStorage.getItem(RESTORE_MARKER)) return;
    const day = state.log["2026-08-13"];
    if (day && day.seconds < day.goalSeconds) {
      state = {
        ...state,
        log: { ...state.log, "2026-08-13": { ...day, seconds: day.goalSeconds } },
      };
      void logDiag("restore", `2026-08-13 topped up to ${day.goalSeconds}s`);
      persist();
    }
    await AsyncStorage.setItem(RESTORE_MARKER, "done");
  } catch {
    // best-effort; retried next launch if the marker write failed
  }
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
    log: recordSeconds(state.log, date, whole, state.goalSeconds),
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
    log: updateDayGoal(state.log, todayLocalDate(), goalSeconds),
  };
  void logDiag("goal", `${goalSeconds}s`);
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
