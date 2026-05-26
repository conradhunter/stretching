import type { Segment } from "../timer/engine";
import { buildSegments, optionDuration, type Stretch, type TimeOption } from "../stretches/segments";

export type RoutineItem = { stretchId: string; optionIndex: number };
export type Routine = { id: string; name: string; items: RoutineItem[] };

// A resolved item: the routine's stretchId/optionIndex looked up against the library.
export type ResolvedItem = { stretch: Pick<Stretch, "name" | "image">; option: TimeOption };

const DEFAULT_PREP_SECONDS = 10;

// Chains a routine into one segment list: a "Next: <name>" prep before each
// stretch (so the voice announces what's coming and you can reposition),
// followed by that stretch's work segments. Every segment carries the stretch
// image so the running screen can show the current photo.
export function buildRoutineSegments(
  items: ResolvedItem[],
  prepSeconds: number = DEFAULT_PREP_SECONDS
): Segment[] {
  const out: Segment[] = [];
  for (const { stretch, option } of items) {
    out.push({ label: `Next: ${stretch.name}`, seconds: prepSeconds, image: stretch.image, prep: true });
    for (const segment of buildSegments(stretch, option)) {
      out.push({ ...segment, image: stretch.image });
    }
  }
  return out;
}

/** Total run length of a routine: prep + work for every item (matches buildRoutineSegments). */
export function routineDuration(
  items: ResolvedItem[],
  prepSeconds: number = DEFAULT_PREP_SECONDS
): number {
  return items.reduce((total, { option }) => total + prepSeconds + optionDuration(option), 0);
}

export function addItem(routine: Routine, item: RoutineItem): Routine {
  return { ...routine, items: [...routine.items, item] };
}

export function removeItem(routine: Routine, index: number): Routine {
  return { ...routine, items: routine.items.filter((_, i) => i !== index) };
}

export function moveItem(routine: Routine, from: number, to: number): Routine {
  const { items } = routine;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return routine;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...routine, items: next };
}
