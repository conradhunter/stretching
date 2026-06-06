import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { type CustomStretchInput, makeCustomStretch, mergeStretches } from "./custom";
import { stretches as library } from "./library";
import type { Stretch } from "./segments";

const KEY = "customStretches.v1";

let custom: Stretch[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist(next: Stretch[]) {
  custom = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    custom = raw ? (JSON.parse(raw) as Stretch[]) : [];
  } catch {
    custom = [];
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

export function addCustomStretch(input: CustomStretchInput): Stretch {
  const taken = [...library, ...custom].map((s) => s.id);
  const stretch = makeCustomStretch(input, taken);
  persist([...custom, stretch]);
  return stretch;
}

export function updateCustomStretch(id: string, input: CustomStretchInput) {
  persist(
    custom.map((s) => {
      if (s.id !== id) return s;
      // Rebuild content but keep the id stable so routines keep resolving.
      const next = makeCustomStretch(input, []);
      return { ...next, id: s.id, image: s.image };
    })
  );
}

export function deleteCustomStretch(id: string) {
  persist(custom.filter((s) => s.id !== id));
}

/** Subscribe a component to the (persisted) user-created stretches. */
export function useCustomStretches(): Stretch[] {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => custom,
    () => custom
  );
}

/** Library + custom stretches, name-sorted; re-renders when customs change. */
export function useAllStretches(): Stretch[] {
  const customs = useCustomStretches();
  return useMemo(() => mergeStretches(library, customs), [customs]);
}

/** Snapshot of library + custom stretches for non-React lookups (resolve, run plan). */
export function getAllStretches(): Stretch[] {
  return mergeStretches(library, custom);
}
