// Library pruning rules, used by scripts/build-library.ts (not by the app).
// Decides which dataset entries are noise for a timed-hold stretching app.
// Dropped entries are recorded in src/stretches/DROPPED.md — to rescue one,
// add its id to KEEP below and re-run the build script.

export type PruneCandidate = { id: string; name: string; instructions: string[] };

// Rescues: keep these ids even when a heuristic below matches them.
const KEEP = new Set(["superman"]);

/** Why an entry is dropped from the library, or null to keep it. */
export function dropReason(candidate: PruneCandidate): string | null {
  if (KEEP.has(candidate.id)) return null;
  if (/\bSMR\b/i.test(candidate.name)) return "foam rolling (SMR)";
  const text = candidate.instructions.join(" ");
  if (/\bpartner\b/i.test(text)) return "needs a partner";
  if (/\b(repetitions|reps)\b/i.test(text)) return "rep-based movement, not a timed hold";
  return null;
}
