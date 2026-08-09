import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { ensureMetDays, recordSeconds, type StreakLog } from "./streaks";
import { todayLocalDate } from "./today";

const KEY = "tracking.v1";
export const DEFAULT_GOAL_SECONDS = 15 * 60;
const MIN_GOAL_SECONDS = 60;

export type Tracking = { log: StreakLog; goalSeconds: number };

let state: Tracking = { log: {}, goalSeconds: DEFAULT_GOAL_SECONDS };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// One-time restore of the 37-day streak lost to the Aug 2026 same-version
// reinstall. v2: the v1 never-overwrite backfill skipped Aug 8, which already
// held a partial post-wipe test session, leaving the streak at 0 (and v1's
// marker set) — so this tops unmet days in the window up to their own goal
// under a fresh marker. Runs once (marker key), never reduces real data.
// Safe to delete once it has run on the phone.
const RESTORE_MARKER = "tracking.restore-2026-08-09.v2";

async function restoreWipedStreak() {
  try {
    if (await AsyncStorage.getItem(RESTORE_MARKER)) return;
    state = {
      ...state,
      log: ensureMetDays(state.log, "2026-08-08", 37, DEFAULT_GOAL_SECONDS),
    };
    persist();
    await AsyncStorage.setItem(RESTORE_MARKER, "done");
  } catch {
    // best-effort; retried next launch if the marker write failed
  }
}

async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Tracking>;
      state = {
        log: parsed.log ?? {},
        goalSeconds: parsed.goalSeconds ?? DEFAULT_GOAL_SECONDS,
      };
    }
  } catch {
    // keep defaults on a bad/empty read
  }
  await restoreWipedStreak();
  loaded = true;
  emit();
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Log stretched seconds against today, locking today's goal on first record. */
export function recordStretchSeconds(seconds: number) {
  const whole = Math.round(seconds);
  if (whole <= 0) return;
  state = {
    ...state,
    log: recordSeconds(state.log, todayLocalDate(), whole, state.goalSeconds),
  };
  emit();
  persist();
}

/** Set the daily goal (in minutes). Affects today only if today has no sessions yet. */
export function setGoalMinutes(minutes: number) {
  state = { ...state, goalSeconds: Math.max(MIN_GOAL_SECONDS, Math.round(minutes * 60)) };
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
