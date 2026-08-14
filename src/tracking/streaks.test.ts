import { describe, expect, it } from "bun:test";
import {
  currentStreak,
  updateDayGoal,
  longestStreak,
  recordSeconds,
  todayProgress,
  type StreakLog,
} from "./streaks";

// A met day: seconds >= goalSeconds. Goal is 15 min (900s) unless noted.
const met = { seconds: 900, goalSeconds: 900 };
const short = { seconds: 300, goalSeconds: 900 };

describe("recordSeconds", () => {
  it("logs seconds into a fresh day and snapshots that day's goal", () => {
    const log = recordSeconds({}, "2026-05-26", 120, 900);

    expect(log["2026-05-26"]).toEqual({ seconds: 120, goalSeconds: 900 });
  });

  it("accumulates later sessions but keeps the day's original goal", () => {
    const first = recordSeconds({}, "2026-05-26", 120, 900);
    const second = recordSeconds(first, "2026-05-26", 200, 600);

    expect(second["2026-05-26"]).toEqual({ seconds: 320, goalSeconds: 900 });
  });

  it("does not mutate the input log", () => {
    const before = recordSeconds({}, "2026-05-26", 120, 900);
    recordSeconds(before, "2026-05-26", 60, 900);

    expect(before["2026-05-26"].seconds).toBe(120);
  });
});

describe("currentStreak", () => {
  it("counts consecutive met days ending today", () => {
    const log: StreakLog = {
      "2026-05-24": met,
      "2026-05-25": met,
      "2026-05-26": met,
    };

    expect(currentStreak(log, "2026-05-26")).toBe(3);
  });

  it("does not break when today is still in progress (under goal)", () => {
    const log: StreakLog = {
      "2026-05-24": met,
      "2026-05-25": met,
      "2026-05-26": short, // today, not yet at goal
    };

    expect(currentStreak(log, "2026-05-26")).toBe(2);
  });

  it("counts today once it reaches goal", () => {
    const log: StreakLog = {
      "2026-05-25": met,
      "2026-05-26": met,
    };

    expect(currentStreak(log, "2026-05-26")).toBe(2);
  });

  it("breaks the streak on a fully missed day", () => {
    const log: StreakLog = {
      "2026-05-23": met,
      "2026-05-24": met,
      // 2026-05-25 missed entirely
      "2026-05-26": met,
    };

    expect(currentStreak(log, "2026-05-26")).toBe(1);
  });

  it("is 0 when yesterday was missed and today isn't done yet", () => {
    const log: StreakLog = { "2026-05-24": met }; // 25 missed, 26 (today) empty
    expect(currentStreak(log, "2026-05-26")).toBe(0);
  });

  it("is 0 for an empty log", () => {
    expect(currentStreak({}, "2026-05-26")).toBe(0);
  });

  it("treats an under-goal past day as a miss", () => {
    const log: StreakLog = { "2026-05-25": short, "2026-05-26": met };
    expect(currentStreak(log, "2026-05-26")).toBe(1);
  });

  it("counts across a month boundary", () => {
    const log: StreakLog = { "2026-04-30": met, "2026-05-01": met };
    expect(currentStreak(log, "2026-05-01")).toBe(2);
  });
});

describe("longestStreak", () => {
  it("is 0 for an empty log", () => {
    expect(longestStreak({})).toBe(0);
  });

  it("finds the longest run of consecutive met days, ignoring gaps", () => {
    const log: StreakLog = {
      "2026-05-01": met,
      "2026-05-02": met,
      "2026-05-03": met,
      // gap
      "2026-05-05": met,
      "2026-05-06": met,
    };

    expect(longestStreak(log)).toBe(3);
  });

  it("ignores under-goal days when measuring runs", () => {
    const log: StreakLog = {
      "2026-05-01": met,
      "2026-05-02": short, // breaks the run
      "2026-05-03": met,
      "2026-05-04": met,
    };

    expect(longestStreak(log)).toBe(2);
  });
});

describe("todayProgress", () => {
  it("reports today's seconds against the day's locked goal", () => {
    const log: StreakLog = { "2026-05-26": short };
    const p = todayProgress(log, "2026-05-26", 600);

    expect(p.seconds).toBe(300);
    expect(p.goalSeconds).toBe(900); // the day's snapshot, not the passed-in 600
    expect(p.met).toBe(false);
    expect(p.fraction).toBeCloseTo(1 / 3);
  });

  it("uses the current goal when today has no sessions yet", () => {
    const p = todayProgress({}, "2026-05-26", 600);

    expect(p).toEqual({ seconds: 0, goalSeconds: 600, fraction: 0, ring: 0, met: false });
  });

  it("clamps the fraction at 1 and marks met when over goal", () => {
    const log: StreakLog = { "2026-05-26": { seconds: 1200, goalSeconds: 900 } };
    const p = todayProgress(log, "2026-05-26", 900);

    expect(p.fraction).toBe(1);
    expect(p.met).toBe(true);
  });

  it("never renders a near-miss as a closed ring (the Aug 13 trap)", () => {
    // 1185/1200 = 98.75% — visually indistinguishable from full on a small
    // ring, which read as "goal met" and silently broke the streak overnight.
    const log: StreakLog = { "2026-08-13": { seconds: 1185, goalSeconds: 1200 } };
    const p = todayProgress(log, "2026-08-13", 1200);

    expect(p.met).toBe(false);
    expect(p.ring).toBeLessThanOrEqual(0.92);
  });

  it("only a truly met day closes the ring", () => {
    const log: StreakLog = { "2026-08-13": { seconds: 1200, goalSeconds: 1200 } };
    expect(todayProgress(log, "2026-08-13", 1200).ring).toBe(1);
  });

  it("keeps the ring honest below the cap", () => {
    const log: StreakLog = { "2026-08-13": { seconds: 600, goalSeconds: 1200 } };
    expect(todayProgress(log, "2026-08-13", 1200).ring).toBeCloseTo(0.5);
  });
});
describe("updateDayGoal", () => {
  it("re-locks an in-progress day's goal so the ring follows the live setting", () => {
    const log: StreakLog = { "2026-08-11": { seconds: 300, goalSeconds: 900 } };
    const updated = updateDayGoal(log, "2026-08-11", 1800);

    expect(updated["2026-08-11"]).toEqual({ seconds: 300, goalSeconds: 1800 });
    const p = todayProgress(updated, "2026-08-11", 1800);
    expect(p.goalSeconds).toBe(1800);
    expect(p.fraction).toBeCloseTo(300 / 1800);
  });

  it("lowering the goal below already-stretched time makes today met", () => {
    const log: StreakLog = { "2026-08-11": { seconds: 600, goalSeconds: 900 } };
    const updated = updateDayGoal(log, "2026-08-11", 300);

    expect(todayProgress(updated, "2026-08-11", 300).met).toBe(true);
  });

  it("is a no-op for a day with no entry (untouched days use the live goal already)", () => {
    const log: StreakLog = { "2026-08-10": met };
    expect(updateDayGoal(log, "2026-08-11", 1800)).toEqual(log);
  });

  it("touches only the given day and does not mutate the input", () => {
    const log: StreakLog = {
      "2026-08-10": { seconds: 900, goalSeconds: 900 },
      "2026-08-11": { seconds: 60, goalSeconds: 900 },
    };
    const updated = updateDayGoal(log, "2026-08-11", 1800);

    expect(updated["2026-08-10"]).toEqual({ seconds: 900, goalSeconds: 900 });
    expect(log["2026-08-11"]).toEqual({ seconds: 60, goalSeconds: 900 });
  });
});
