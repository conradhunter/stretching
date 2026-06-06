import type { Stretch, TimeOption } from "./segments";

// Pure logic for user-created stretches. Persistence lives in ./customStore.

export type CustomStretchInput = {
  name: string;
  /** Two-sided stretch (per-side options) vs a single hold. */
  perSide: boolean;
  /** Chosen durations in seconds (per side when perSide). */
  seconds: number[];
  muscles: string[];
};

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Builds a library-shaped Stretch from form input; never collides with `takenIds`. */
export function makeCustomStretch(input: CustomStretchInput, takenIds: string[]): Stretch {
  const name = input.name.trim();
  const taken = new Set(takenIds);
  const base = `custom-${slug(name)}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;

  // Longest first, matching the generated library's option order.
  const seconds = [...input.seconds].sort((a, b) => b - a);
  const options: TimeOption[] = seconds.map((s) =>
    input.perSide ? { kind: "perSide", secondsPerSide: s } : { kind: "hold", seconds: s }
  );

  return { id, name, image: id, instructions: [], muscles: input.muscles, options };
}

/** True for user-created stretch ids (vs generated library ids). */
export function isCustomStretch(id: string): boolean {
  return id.startsWith("custom-");
}

/** Library + custom stretches as one list, name-sorted like the generated data. */
export function mergeStretches(library: Stretch[], custom: Stretch[]): Stretch[] {
  return [...library, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}
