import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { useSyncExternalStore } from "react";

import { type Routine } from "./routines";

const KEY = "routines.v1";

let routines: Routine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist(next: Routine[]) {
  routines = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    routines = raw ? (JSON.parse(raw) as Routine[]) : [];
  } catch {
    routines = [];
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

export function getRoutine(id: string): Routine | undefined {
  return routines.find((r) => r.id === id);
}

export function createRoutine(name: string): Routine {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const routine: Routine = { id, name, items: [] };
  persist([...routines, routine]);
  return routine;
}

export function updateRoutine(id: string, update: (routine: Routine) => Routine) {
  persist(routines.map((r) => (r.id === id ? update(r) : r)));
}

export function deleteRoutine(id: string) {
  persist(routines.filter((r) => r.id !== id));
}

/** Subscribe a component to the (persisted) list of routines. */
export function useRoutines(): Routine[] {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => routines,
    () => routines
  );
}
