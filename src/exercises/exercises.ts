import type { Segment } from "../timer/engine";

export type ExerciseId = "pushups" | "crunches" | "pullups";

export type Exercise = {
  id: ExerciseId;
  name: string;
  /** SF Symbol for the tab card. */
  symbol: string;
  /**
   * The two halves of one rep, in the order they're performed — the words the
   * run screen flashes while the phone sits on the floor in front of you.
   */
  phases: [string, string];
  /** Seconds each phase is held. The pace: a rep takes twice this. */
  secondsPerPhase: number;
  /** Rep counts offered on the Exercises tab. */
  presets: number[];
};

/** Lead-in before the first rep — time to get into position. */
export const READY_SECONDS = 5;

// Paces are deliberately unhurried: the timer has to leave room to actually
// finish every rep, so a set that runs long is fine and one that runs short is
// not. Pull-ups get the slowest beat.
export const EXERCISES: Exercise[] = [
  {
    id: "pushups",
    name: "Push-ups",
    symbol: "figure.strengthtraining.functional",
    phases: ["Down", "Up"],
    secondsPerPhase: 2,
    presets: [10, 15, 20, 25],
  },
  {
    id: "crunches",
    name: "Crunches",
    symbol: "figure.core.training",
    phases: ["Up", "Down"],
    secondsPerPhase: 2,
    presets: [15, 20, 30, 50],
  },
  {
    id: "pullups",
    name: "Pull-ups",
    symbol: "figure.strengthtraining.traditional",
    phases: ["Up", "Down"],
    secondsPerPhase: 3,
    presets: [3, 5, 8, 10],
  },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** Lead-in, then one segment per phase per rep — the whole paced set. */
export function buildRepSegments(exercise: Exercise, reps: number): Segment[] {
  if (reps <= 0) return [];
  const segments: Segment[] = [{ label: "Get ready", seconds: READY_SECONDS, prep: true }];
  for (let i = 0; i < reps; i++) {
    for (const label of exercise.phases) {
      segments.push({ label, seconds: exercise.secondsPerPhase });
    }
  }
  return segments;
}

export function sessionSeconds(exercise: Exercise, reps: number): number {
  return READY_SECONDS + reps * exercise.secondsPerPhase * 2;
}

/**
 * Reps banked by the time segment `segmentIndex` starts. Segment 0 is the
 * lead-in and each rep is two segments, so a rep only counts once its second
 * phase has ended — a set abandoned halfway through a rep credits the rep
 * before it, never the one in progress.
 */
export function repsCompletedAt(segmentIndex: number): number {
  return Math.max(0, Math.floor((segmentIndex - 1) / 2));
}

/** The 1-based rep on screen ("Rep 3 of 10"), clamped to the set. */
export function currentRep(segmentIndex: number, reps: number): number {
  return Math.min(reps, repsCompletedAt(segmentIndex) + 1);
}
