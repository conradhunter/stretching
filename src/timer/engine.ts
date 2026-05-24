export type Segment = { label: string; seconds: number; image?: string };
export type TimerStatus = "running" | "paused" | "completed";

export type TimerState = {
  status: TimerStatus;
  segmentIndex: number;
  remaining: number;
  segments: Segment[];
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
  };
}

export function tick(state: TimerState): TickResult {
  if (state.status !== "running") {
    return { state, events: [] };
  }

  const remaining = state.remaining - 1;
  if (remaining > 0) {
    return { state: { ...state, remaining }, events: [] };
  }

  return endCurrentSegment(state);
}

export function skip(state: TimerState): TickResult {
  if (state.status === "completed") {
    return { state, events: [] };
  }

  return endCurrentSegment(state);
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
