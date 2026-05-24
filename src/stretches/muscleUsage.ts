import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "muscleUsage.v1";

let counts: Record<string, number> = {};
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    counts = {};
  }
  loaded = true;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Record one tap of a muscle filter (persisted). */
export function bumpMuscle(muscle: string) {
  counts = { ...counts, [muscle]: (counts[muscle] ?? 0) + 1 };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(counts)).catch(() => {});
}

/** Subscribe to the (persisted) per-muscle tap counts. */
export function useMuscleCounts(): Record<string, number> {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => counts,
    () => counts
  );
}
