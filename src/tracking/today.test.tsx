import { afterEach, describe, expect, it, jest, mock, setSystemTime } from "bun:test";
import { act, renderHook } from "@testing-library/react";

// react-native can't be parsed by bun's test runner, so the hook sees this
// fake AppState. Tests drive foreground/background via emitAppState.
type AppStateListener = (state: string) => void;
const listeners = new Set<AppStateListener>();
const emitAppState = (state: string) => listeners.forEach((l) => l(state));

mock.module("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_type: string, listener: AppStateListener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  },
}));

const { todayLocalDate, useTodayLocalDate } = await import("./today");

describe("useTodayLocalDate", () => {
  afterEach(() => {
    setSystemTime(); // back to real time
    listeners.clear();
  });

  it("returns today's local date", () => {
    setSystemTime(new Date(2026, 7, 8, 12, 0, 0));
    const { result } = renderHook(() => useTodayLocalDate());
    expect(result.current).toBe("2026-08-08");
  });

  it("refreshes when the app returns to the foreground on a new day", () => {
    setSystemTime(new Date(2026, 7, 8, 23, 0, 0));
    const { result } = renderHook(() => useTodayLocalDate());
    expect(result.current).toBe("2026-08-08");

    setSystemTime(new Date(2026, 7, 9, 7, 0, 0));
    act(() => emitAppState("active"));
    expect(result.current).toBe("2026-08-09");
  });

  it("keeps the same date when foregrounded on the same day", () => {
    setSystemTime(new Date(2026, 7, 8, 9, 0, 0));
    const { result } = renderHook(() => useTodayLocalDate());

    setSystemTime(new Date(2026, 7, 8, 17, 0, 0));
    act(() => emitAppState("active"));
    expect(result.current).toBe("2026-08-08");
  });

  // bun's advanceTimersByTime moves Date along a clock seeded from real time
  // (ignoring setSystemTime), so this test works in real-now + fake-advance.
  it("rolls over at midnight while the app stays open", () => {
    jest.useFakeTimers();
    try {
      const start = new Date();
      const { result } = renderHook(() => useTodayLocalDate());
      expect(result.current).toBe(todayLocalDate(start));

      const twentyFiveHours = 25 * 60 * 60 * 1000; // always crosses a midnight
      act(() => jest.advanceTimersByTime(twentyFiveHours));
      expect(result.current).toBe(todayLocalDate(new Date(start.getTime() + twentyFiveHours)));
      expect(result.current).not.toBe(todayLocalDate(start));
    } finally {
      jest.useRealTimers();
    }
  });

  it("stops listening to app-state changes after unmount", () => {
    const { unmount } = renderHook(() => useTodayLocalDate());
    expect(listeners.size).toBe(1);

    unmount();
    expect(listeners.size).toBe(0);
  });
});
