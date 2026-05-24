import type { Stretch } from "./segments";

export type MuscleGroup = { name: string; muscles: string[] };

// Buckets the library's ~16 primary muscles into a handful of browsable groups.
// Keep in sync with the library — the test guards that every muscle is mapped.
export const MUSCLE_GROUPS: MuscleGroup[] = [
  { name: "Legs", muscles: ["hamstrings", "quadriceps", "calves", "glutes", "adductors", "abductors"] },
  { name: "Back", muscles: ["lower back", "middle back", "lats"] },
  { name: "Shoulders & Arms", muscles: ["shoulders", "triceps", "biceps", "forearms"] },
  { name: "Chest", muscles: ["chest"] },
  { name: "Core", muscles: ["abdominals"] },
  { name: "Neck", muscles: ["neck"] },
];

function musclesForGroup(groupName: string): string[] {
  return MUSCLE_GROUPS.find((g) => g.name === groupName)?.muscles ?? [];
}

/** Filters by a text query (name or muscle) AND, if any groups are selected, by group membership (OR). */
export function filterStretches(
  stretches: Stretch[],
  query: string,
  selectedGroups: string[]
): Stretch[] {
  const q = query.trim().toLowerCase();
  const selectedMuscles = new Set(selectedGroups.flatMap(musclesForGroup));

  return stretches.filter((stretch) => {
    const matchesQuery =
      q === "" ||
      stretch.name.toLowerCase().includes(q) ||
      stretch.muscles.some((m) => m.toLowerCase().includes(q));

    const matchesGroups =
      selectedMuscles.size === 0 || stretch.muscles.some((m) => selectedMuscles.has(m));

    return matchesQuery && matchesGroups;
  });
}
