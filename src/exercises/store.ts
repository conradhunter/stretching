import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { todayLocalDate } from "../tracking/today";
import { recordReps, type ExerciseLog } from "./log";

export const EXERCISES_KEY = "exercises.v1";

let log: ExerciseLog = {};
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Single-flight, and awaited by every mutator — a write must never race the
// disk load and persist an empty log over the real history.
function init(): Promise<void> {
  initPromise ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(EXERCISES_KEY);
      if (raw) log = (JSON.parse(raw) as { log?: ExerciseLog }).log ?? {};
    } catch (e) {
      console.warn("[exercises] failed to load:", e);
    }
    emit();
  })();
  return initPromise;
}

function persist() {
  AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify({ log })).catch((e) => {
    console.warn("[exercises] failed to persist:", e);
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/**
 * Credit finished reps to today. Called per rep boundary during a set (not
 * just at the end) so a force-quit mid-set still keeps what was done.
 */
export async function recordExerciseReps(exerciseId: string, reps: number) {
  const whole = Math.round(reps);
  if (whole <= 0) return;
  await init();
  log = recordReps(log, todayLocalDate(), exerciseId, whole);
  emit();
  persist();
}

/** Subscribe to the persisted exercise day log. */
export function useExerciseLog(): ExerciseLog {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => log,
    () => log
  );
}
