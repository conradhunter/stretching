export type Segment = { label: string; seconds: number; image?: string; prep?: boolean };
export type TimerStatus = "running" | "paused" | "completed";

export type TimerState = {
  status: TimerStatus;
  segmentIndex: number;
  remaining: number;
  segments: Segment[];
  // Seconds actually ticked on non-prep segments — excludes prep, pause, skip.
  elapsedStretchSeconds: number;
};

export type TimerEvent =
  | { type: "segment-advance"; index: number; segment: Segment }
  | { type: "completed" };

export type TickResult = { state: TimerState; events: TimerEvent[] };

export function createTimer(segments: Segment[]): TimerState {
  return {
    status: "running",
    segmentIndex: 0,
    remaining: segments[0].seconds,
    segments,
    elapsedStretchSeconds: 0,
  };
}

export function tick(state: TimerState): TickResult {
  if (state.status !== "running") {
    return { state, events: [] };
  }

  // This tick consumed one second of the current segment; credit it as stretched
  // time unless that segment is a prep ("Get ready" / "Next: …") countdown.
  const isPrep = state.segments[state.segmentIndex].prep === true;
  const counted: TimerState = isPrep
    ? state
    : { ...state, elapsedStretchSeconds: state.elapsedStretchSeconds + 1 };

  const remaining = counted.remaining - 1;
  if (remaining > 0) {
    return { state: { ...counted, remaining }, events: [] };
  }

  return endCurrentSegment(counted);
}

export function skip(state: TimerState): TickResult {
  if (state.status === "completed") {
    return { state, events: [] };
  }

  return endCurrentSegment(state);
}

export function previous(state: TimerState): TickResult {
  if (state.status === "completed") {
    return { state, events: [] };
  }

  // Go to the start of the prior segment; at the first segment, restart it.
  // Keeps the running/paused status and the accumulated stretched time.
  const prevIndex = Math.max(0, state.segmentIndex - 1);
  const segment = state.segments[prevIndex];
  return {
    state: { ...state, segmentIndex: prevIndex, remaining: segment.seconds },
    events: [{ type: "segment-advance", index: prevIndex, segment }],
  };
}

export function pause(state: TimerState): TimerState {
  return state.status === "running" ? { ...state, status: "paused" } : state;
}

export function resume(state: TimerState): TimerState {
  return state.status === "paused" ? { ...state, status: "running" } : state;
}

// Ends the current segment, either advancing to the next one (emitting the
// "switch" event) or completing the whole timer (emitting "done").
function endCurrentSegment(state: TimerState): TickResult {
  const isLastSegment = state.segmentIndex >= state.segments.length - 1;
  if (isLastSegment) {
    return {
      state: { ...state, remaining: 0, status: "completed" },
      events: [{ type: "completed" }],
    };
  }

  const nextIndex = state.segmentIndex + 1;
  const nextSegment = state.segments[nextIndex];
  return {
    state: { ...state, segmentIndex: nextIndex, remaining: nextSegment.seconds },
    events: [{ type: "segment-advance", index: nextIndex, segment: nextSegment }],
  };
}
