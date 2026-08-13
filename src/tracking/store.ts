import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { recordSeconds, updateDayGoal, type StreakLog } from "./streaks";
import { todayLocalDate } from "./today";

const KEY = "tracking.v1";
export const DEFAULT_GOAL_SECONDS = 15 * 60;
const MIN_GOAL_SECONDS = 60;

export type Tracking = { log: StreakLog; goalSeconds: number };

let state: Tracking = { log: {}, goalSeconds: DEFAULT_GOAL_SECONDS };
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Single-flight: mutators await this so a write can never race the disk load
// and persist a near-empty log over the real history.
function init(): Promise<void> {
  initPromise ??= (async () => {
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
    emit();
  })();
  return initPromise;
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
export async function recordStretchSeconds(seconds: number) {
  const whole = Math.round(seconds);
  if (whole <= 0) return;
  await init();
  state = {
    ...state,
    log: recordSeconds(state.log, todayLocalDate(), whole, state.goalSeconds),
  };
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
