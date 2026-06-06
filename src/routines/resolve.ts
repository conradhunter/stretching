import { getAllStretches } from "../stretches/customStore";
import { type ResolvedItem, type RoutineItem, routineDuration } from "./routines";

/** Looks raw routine items up against the library + customs, dropping any that no longer resolve. */
export function resolveItems(raw: RoutineItem[]): ResolvedItem[] {
  const stretches = getAllStretches();
  return raw
    .map((it): ResolvedItem | null => {
      const stretch = stretches.find((s) => s.id === it.stretchId);
      const option = stretch?.options[it.optionIndex];
      return stretch && option ? { stretch, option } : null;
    })
    .filter((x): x is ResolvedItem => x !== null);
}

/** Total run length (seconds) of raw routine items — prep + work. */
export function itemsDuration(raw: RoutineItem[]): number {
  return routineDuration(resolveItems(raw));
}
