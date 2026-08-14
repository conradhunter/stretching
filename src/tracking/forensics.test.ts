import { describe, expect, it } from "bun:test";
import {
  appendEvent,
  lastNDays,
  metDayCount,
  shouldReplaceBackup,
  type DiagEvent,
} from "./forensics";
import type { StreakLog } from "./streaks";

const met = { seconds: 900, goalSeconds: 900 };
const short = { seconds: 300, goalSeconds: 900 };

function ev(n: number): DiagEvent {
  return { at: `t${n}`, type: "credit", detail: String(n) };
}

describe("appendEvent", () => {
  it("appends to the end without mutating the input", () => {
    const before = [ev(1)];
    const after = appendEvent(before, ev(2));

    expect(after.map((e) => e.detail)).toEqual(["1", "2"]);
    expect(before).toHaveLength(1);
  });

  it("drops the oldest events once past the cap", () => {
    let events: DiagEvent[] = [];
    for (let i = 0; i < 10; i++) events = appendEvent(events, ev(i), 4);

    expect(events.map((e) => e.detail)).toEqual(["6", "7", "8", "9"]);
  });
});

describe("metDayCount", () => {
  it("counts only days at or over their locked goal", () => {
    const log: StreakLog = {
      "2026-08-11": met,
      "2026-08-12": short,
      "2026-08-13": met,
    };

    expect(metDayCount(log)).toBe(2);
  });

  it("is 0 for an empty log", () => {
    expect(metDayCount({})).toBe(0);
  });
});

describe("shouldReplaceBackup", () => {
  it("writes a first backup only when the candidate has met days", () => {
    expect(shouldReplaceBackup(null, { "2026-08-13": met })).toBe(true);
    expect(shouldReplaceBackup(null, { "2026-08-13": short })).toBe(false);
    expect(shouldReplaceBackup(null, {})).toBe(false);
  });

  it("replaces only when the candidate has strictly more met days (backup can never shrink)", () => {
    const two: StreakLog = { "2026-08-12": met, "2026-08-13": met };
    const three: StreakLog = { ...two, "2026-08-14": met };

    expect(shouldReplaceBackup(two, three)).toBe(true);
    expect(shouldReplaceBackup(two, two)).toBe(false);
    // a wiped/shrunken candidate must never clobber the backup
    expect(shouldReplaceBackup(three, {})).toBe(false);
    expect(shouldReplaceBackup(three, two)).toBe(false);
  });
});

describe("lastNDays", () => {
  it("lists today and the preceding days, newest first", () => {
    expect(lastNDays("2026-08-14", 3)).toEqual(["2026-08-14", "2026-08-13", "2026-08-12"]);
  });

  it("crosses month boundaries", () => {
    expect(lastNDays("2026-08-01", 2)).toEqual(["2026-08-01", "2026-07-31"]);
  });
});
