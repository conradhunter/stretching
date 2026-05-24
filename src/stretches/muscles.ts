import type { Stretch } from "./segments";

/**
 * "Looser" filter pills: each groups several specific muscles. Selecting a
 * group matches any stretch hitting one of its members. Order here is the
 * display order (pinned ahead of the individual muscle pills).
 */
export const MUSCLE_GROUPS: { name: string; muscles: string[] }[] = [
  { name: "legs", muscles: ["hamstrings", "quadriceps", "calves", "glutes", "adductors", "abductors"] },
  { name: "back", muscles: ["lower back", "lats", "middle back"] },
  { name: "arms", muscles: ["biceps", "triceps", "forearms"] },
];

const GROUP_BY_NAME = new Map(MUSCLE_GROUPS.map((g) => [g.name, g.muscles]));

/** True if `token` is a muscle-group name (vs an individual muscle). */
export function isMuscleGroup(token: string): boolean {
  return GROUP_BY_NAME.has(token);
}

/** Replaces any group token in `selected` with its member muscles, de-duplicated. */
export function expandMuscleSelection(selected: string[]): string[] {
  const out = new Set<string>();
  for (const token of selected) {
    const members = GROUP_BY_NAME.get(token);
    if (members) members.forEach((m) => out.add(m));
    else out.add(token);
  }
  return [...out];
}

/** Distinct muscles across the library, ordered by how many stretches use each (popularity). */
export function allMuscles(stretches: Stretch[]): string[] {
  const freq = new Map<string, number>();
  for (const stretch of stretches) {
    for (const muscle of stretch.muscles) {
      freq.set(muscle, (freq.get(muscle) ?? 0) + 1);
    }
  }
  return [...freq.keys()].sort(
    (a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || a.localeCompare(b)
  );
}

/** Re-orders muscles by the user's tap counts (desc), keeping the base order for ties. */
export function orderByUsage(muscles: string[], counts: Record<string, number>): string[] {
  return muscles
    .map((muscle, index) => ({ muscle, index }))
    .sort((a, b) => (counts[b.muscle] ?? 0) - (counts[a.muscle] ?? 0) || a.index - b.index)
    .map((x) => x.muscle);
}

/** Filters by a text query (name or muscle) AND, if any muscles are selected, by membership (OR). */
export function filterStretches(
  stretches: Stretch[],
  query: string,
  selectedMuscles: string[]
): Stretch[] {
  const q = query.trim().toLowerCase();
  const selected = new Set(selectedMuscles);

  return stretches.filter((stretch) => {
    const matchesQuery =
      q === "" ||
      stretch.name.toLowerCase().includes(q) ||
      stretch.muscles.some((m) => m.toLowerCase().includes(q));

    const matchesMuscle = selected.size === 0 || stretch.muscles.some((m) => selected.has(m));

    return matchesQuery && matchesMuscle;
  });
}

/** Title-cases a muscle name for display ("lower back" -> "Lower Back"). */
export function muscleLabel(muscle: string): string {
  return muscle.replace(/\b\w/g, (c) => c.toUpperCase());
}
