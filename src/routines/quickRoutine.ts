import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { type RoutineItem } from "./routines";

const KEY = "quickRoutine.v1";

let items: RoutineItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist(next: RoutineItem[]) {
  items = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    items = raw ? (JSON.parse(raw) as RoutineItem[]) : [];
  } catch {
    items = [];
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

export function getQuickItems(): RoutineItem[] {
  return items;
}

export function addToQuick(stretchId: string, optionIndex = 0) {
  persist([...items, { stretchId, optionIndex }]);
}

export function removeFromQuick(index: number) {
  persist(items.filter((_, i) => i !== index));
}

export function setQuickOption(index: number, optionIndex: number) {
  persist(items.map((item, i) => (i === index ? { ...item, optionIndex } : item)));
}

export function moveInQuick(from: number, to: number) {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  persist(next);
}

export function clearQuick() {
  persist([]);
}

/** Subscribe to the (persisted) quick-routine cart. */
export function useQuickRoutine(): RoutineItem[] {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => items
  );
}
