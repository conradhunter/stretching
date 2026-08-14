import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { appendEvent, type DiagEvent } from "./forensics";

// Persistent breadcrumb trail for streak forensics: app launches, what init
// actually loaded, every credit, goal changes, and any storage errors. Kept in
// its own key so it survives whatever happens to the tracking log itself.
const KEY = "tracking.diag.v1";

let events: DiagEvent[] = [];
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function init(): Promise<void> {
  initPromise ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) events = JSON.parse(raw) as DiagEvent[];
    } catch {
      // an unreadable trail starts fresh — never block the app on diagnostics
    }
    emit();
  })();
  return initPromise;
}

/** Record a breadcrumb. Fire-and-forget safe; ordering preserved via init await. */
export async function logDiag(type: string, detail = "") {
  await init();
  events = appendEvent(events, { at: new Date().toISOString(), type, detail });
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(events)).catch(() => {});
}

/** All breadcrumbs, oldest first. For the debug inspector. */
export function useDiagEvents(): DiagEvent[] {
  useEffect(() => {
    void init();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => events,
    () => events
  );
}
