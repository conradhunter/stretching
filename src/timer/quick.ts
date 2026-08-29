import type { Segment } from "./engine";

// Change-over buffer between the two sides of a per-side hold — time to
// release and reposition. Flagged prep so it doesn't count as stretched time.
export const SWITCH_SECONDS = 5;

/** Beat before the first hold, so you can get into position. */
export const LEAD_IN_SECONDS = 3;

function switchSegment(): Segment {
  return { label: "Switch sides", seconds: SWITCH_SECONDS, prep: true };
}

function leadIn(): Segment {
  return { label: "Get ready", seconds: LEAD_IN_SECONDS, prep: true };
}

export function buildQuickSegments(seconds: number): Segment[] {
  return [leadIn(), { label: "", seconds }];
}

export function buildQuickPerSideSegments(secondsPerSide: number): Segment[] {
  return [
    leadIn(),
    { label: "", seconds: secondsPerSide },
    switchSegment(),
    { label: "", seconds: secondsPerSide },
  ];
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}
