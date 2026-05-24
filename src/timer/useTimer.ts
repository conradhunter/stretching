import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTimer,
  pause,
  resume,
  skip,
  tick,
  type Segment,
  type TickResult,
  type TimerEvent,
  type TimerState,
  type TimerStatus,
} from "./engine";

export type UseTimerOptions = {
  onEvent?: (event: TimerEvent) => void;
};

export type UseTimer = {
  status: TimerStatus;
  segmentIndex: number;
  remaining: number;
  currentSegment: Segment;
  pause: () => void;
  resume: () => void;
  skip: () => void;
};

export function useTimer(segments: Segment[], options: UseTimerOptions = {}): UseTimer {
  const [state, setState] = useState(() => createTimer(segments));
  const stateRef = useRef<TimerState>(state);
  stateRef.current = state;

  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  // Commit a new state and announce its events (switch / done).
  const applyResult = useCallback((result: TickResult) => {
    stateRef.current = result.state;
    setState(result.state);
    result.events.forEach((event) => onEventRef.current?.(event));
  }, []);

  // The only place real time enters: tick once a second while running.
  useEffect(() => {
    if (state.status !== "running") return;

    const id = setInterval(() => applyResult(tick(stateRef.current)), 1000);
    return () => clearInterval(id);
  }, [state.status, applyResult]);

  const pauseTimer = useCallback(
    () => applyResult({ state: pause(stateRef.current), events: [] }),
    [applyResult]
  );
  const resumeTimer = useCallback(
    () => applyResult({ state: resume(stateRef.current), events: [] }),
    [applyResult]
  );
  const skipTimer = useCallback(
    () => applyResult(skip(stateRef.current)),
    [applyResult]
  );

  return {
    status: state.status,
    segmentIndex: state.segmentIndex,
    remaining: state.remaining,
    currentSegment: state.segments[state.segmentIndex],
    pause: pauseTimer,
    resume: resumeTimer,
    skip: skipTimer,
  };
}
