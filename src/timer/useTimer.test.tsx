import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { TimerEvent } from "./engine";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("starts running at the first segment", () => {
    const hold = { label: "hold", seconds: 30 };
    const { result } = renderHook(() => useTimer([hold]));

    expect(result.current.status).toBe("running");
    expect(result.current.segmentIndex).toBe(0);
    expect(result.current.remaining).toBe(30);
    expect(result.current.currentSegment).toEqual(hold);
  });

  it("counts down one second per second", () => {
    const { result } = renderHook(() => useTimer([{ label: "hold", seconds: 30 }]));

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(29);

    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.remaining).toBe(27);
  });

  it("reports switch and completion events to onEvent", () => {
    const events: TimerEvent[] = [];
    const left = { label: "left leg", seconds: 1 };
    const { result } = renderHook(() =>
      useTimer([{ label: "right leg", seconds: 1 }, left], {
        onEvent: (e) => events.push(e),
      })
    );

    act(() => jest.advanceTimersByTime(1000));
    expect(events).toEqual([{ type: "segment-advance", index: 1, segment: left }]);
    expect(result.current.currentSegment).toEqual(left);

    act(() => jest.advanceTimersByTime(1000));
    expect(events).toEqual([
      { type: "segment-advance", index: 1, segment: left },
      { type: "completed" },
    ]);
    expect(result.current.status).toBe("completed");
  });

  it("pauses and resumes the countdown", () => {
    const { result } = renderHook(() => useTimer([{ label: "hold", seconds: 30 }]));

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(29);

    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.remaining).toBe(29);

    act(() => result.current.resume());
    expect(result.current.status).toBe("running");
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(28);
  });

  it("skips to the next segment immediately and reports it", () => {
    const events: TimerEvent[] = [];
    const left = { label: "left leg", seconds: 30 };
    const { result } = renderHook(() =>
      useTimer([{ label: "right leg", seconds: 30 }, left], {
        onEvent: (e) => events.push(e),
      })
    );

    act(() => result.current.skip());

    expect(result.current.currentSegment).toEqual(left);
    expect(result.current.remaining).toBe(30);
    expect(events).toEqual([{ type: "segment-advance", index: 1, segment: left }]);
  });

  it("goes back to the prior segment and reports it", () => {
    const events: TimerEvent[] = [];
    const right = { label: "right leg", seconds: 30 };
    const left = { label: "left leg", seconds: 30 };
    const { result } = renderHook(() =>
      useTimer([right, left], { onEvent: (e) => events.push(e) })
    );

    act(() => result.current.skip());
    expect(result.current.currentSegment).toEqual(left);

    act(() => result.current.previous());
    expect(result.current.currentSegment).toEqual(right);
    expect(result.current.remaining).toBe(30);
    expect(events).toEqual([
      { type: "segment-advance", index: 1, segment: left },
      { type: "segment-advance", index: 0, segment: right },
    ]);
  });

  it("exposes elapsed stretched seconds, excluding the prep lead-in", () => {
    const { result } = renderHook(() =>
      useTimer([
        { label: "Get ready", seconds: 2, prep: true },
        { label: "hold", seconds: 30 },
      ])
    );

    act(() => jest.advanceTimersByTime(2000)); // burn the prep
    expect(result.current.elapsedStretchSeconds).toBe(0);

    act(() => jest.advanceTimersByTime(3000)); // 3s into the real hold
    expect(result.current.elapsedStretchSeconds).toBe(3);
  });

  it("stops counting once completed", () => {
    const { result } = renderHook(() => useTimer([{ label: "hold", seconds: 1 }]));

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.status).toBe("completed");

    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.status).toBe("completed");
    expect(result.current.remaining).toBe(0);
  });
});
