/**
 * Reps done per exercise per day. Deliberately separate from the stretching
 * day log (`src/tracking`): exercises are counted, not timed, and never feed
 * the daily goal or the streak ring.
 */
export type ExerciseDay = Record<string, number>; // exercise id -> reps
export type ExerciseLog = Record<string, ExerciseDay>; // "YYYY-MM-DD" -> day

/** Bank a finished set. Repeat sets on the same day accumulate. */
export function recordReps(
  log: ExerciseLog,
  date: string,
  exerciseId: string,
  reps: number
): ExerciseLog {
  if (reps <= 0) return log;
  const day = log[date] ?? {};
  return {
    ...log,
    [date]: { ...day, [exerciseId]: (day[exerciseId] ?? 0) + reps },
  };
}

export function repsOn(log: ExerciseLog, date: string, exerciseId: string): number {
  return log[date]?.[exerciseId] ?? 0;
}

export function dayTotal(log: ExerciseLog, date: string): number {
  return Object.values(log[date] ?? {}).reduce((sum, n) => sum + n, 0);
}
