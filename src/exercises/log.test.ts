import { describe, expect, it } from "bun:test";
import { dayTotal, recordReps, repsOn } from "./log";

describe("recordReps", () => {
  it("adds reps to a day without touching the rest of the log", () => {
    const log = recordReps({ "2026-08-29": { pushups: 20 } }, "2026-08-30", "pushups", 10);

    expect(log).toEqual({
      "2026-08-29": { pushups: 20 },
      "2026-08-30": { pushups: 10 },
    });
  });

  it("accumulates repeat sets of the same exercise on the same day", () => {
    let log = recordReps({}, "2026-08-30", "pushups", 10);
    log = recordReps(log, "2026-08-30", "pushups", 15);
    log = recordReps(log, "2026-08-30", "crunches", 30);

    expect(log["2026-08-30"]).toEqual({ pushups: 25, crunches: 30 });
  });

  it("ignores a non-positive count", () => {
    const log = { "2026-08-30": { pushups: 10 } };

    expect(recordReps(log, "2026-08-30", "pushups", 0)).toBe(log);
    expect(recordReps(log, "2026-08-30", "pushups", -5)).toBe(log);
  });
});

describe("repsOn", () => {
  it("reads a day's count for one exercise, zero when unlogged", () => {
    const log = { "2026-08-30": { pushups: 25 } };

    expect(repsOn(log, "2026-08-30", "pushups")).toBe(25);
    expect(repsOn(log, "2026-08-30", "pullups")).toBe(0);
    expect(repsOn(log, "2026-08-31", "pushups")).toBe(0);
  });
});

describe("dayTotal", () => {
  it("sums every exercise logged on a day", () => {
    expect(dayTotal({ "2026-08-30": { pushups: 25, crunches: 30 } }, "2026-08-30")).toBe(55);
    expect(dayTotal({}, "2026-08-30")).toBe(0);
  });
});
