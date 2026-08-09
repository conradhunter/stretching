import { describe, expect, it } from "bun:test";
import {
  backfillMetDays,
  currentStreak,
  ensureMetDays,
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

    expect(p).toEqual({ seconds: 0, goalSeconds: 600, fraction: 0, met: false });
  });

  it("clamps the fraction at 1 and marks met when over goal", () => {
    const log: StreakLog = { "2026-05-26": { seconds: 1200, goalSeconds: 900 } };
    const p = todayProgress(log, "2026-05-26", 900);

    expect(p.fraction).toBe(1);
    expect(p.met).toBe(true);
  });
});

describe("backfillMetDays", () => {
  it("adds N consecutive met days ending at endDate", () => {
    const log = backfillMetDays({}, "2026-08-08", 37, 900);

    expect(Object.keys(log).length).toBe(37);
    expect(log["2026-08-08"]).toEqual({ seconds: 900, goalSeconds: 900 });
    expect(log["2026-07-03"]).toEqual({ seconds: 900, goalSeconds: 900 }); // 37th day back
    expect(log["2026-07-02"]).toBeUndefined();
    expect(currentStreak(log, "2026-08-09")).toBe(37); // today unmet, counts from yesterday
  });

  it("never overwrites existing entries", () => {
    const existing: StreakLog = { "2026-08-08": { seconds: 1200, goalSeconds: 600 } };
    const log = backfillMetDays(existing, "2026-08-08", 3, 900);

    expect(log["2026-08-08"]).toEqual({ seconds: 1200, goalSeconds: 600 });
    expect(log["2026-08-07"]).toEqual({ seconds: 900, goalSeconds: 900 });
  });

  it("does not mutate the input log", () => {
    const input: StreakLog = {};
    backfillMetDays(input, "2026-08-08", 2, 900);

    expect(input).toEqual({});
  });
});

describe("ensureMetDays", () => {
  it("adds missing days as met", () => {
    const log = ensureMetDays({}, "2026-08-08", 3, 900);

    expect(log["2026-08-08"]).toEqual({ seconds: 900, goalSeconds: 900 });
    expect(log["2026-08-06"]).toEqual({ seconds: 900, goalSeconds: 900 });
    expect(currentStreak(log, "2026-08-09")).toBe(3);
  });

  it("tops up an unmet day to its own locked goal", () => {
    const existing: StreakLog = { "2026-08-08": { seconds: 60, goalSeconds: 1800 } };
    const log = ensureMetDays(existing, "2026-08-08", 1, 900);

    expect(log["2026-08-08"]).toEqual({ seconds: 1800, goalSeconds: 1800 });
  });

  it("leaves already-met days untouched", () => {
    const existing: StreakLog = { "2026-08-08": { seconds: 2000, goalSeconds: 600 } };
    const log = ensureMetDays(existing, "2026-08-08", 1, 900);

    expect(log["2026-08-08"]).toEqual({ seconds: 2000, goalSeconds: 600 });
  });

  it("does not mutate the input log", () => {
    const input: StreakLog = { "2026-08-08": { seconds: 60, goalSeconds: 900 } };
    ensureMetDays(input, "2026-08-08", 2, 900);

    expect(input["2026-08-08"]).toEqual({ seconds: 60, goalSeconds: 900 });
  });
});
