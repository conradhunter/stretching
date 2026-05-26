import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { recordSeconds, type StreakLog } from "./streaks";

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

/** Today's local calendar date as "YYYY-MM-DD" (device timezone). */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
