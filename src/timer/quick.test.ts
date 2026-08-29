import { describe, expect, it } from "bun:test";
import { buildQuickPerSideSegments, buildQuickSegments, formatDuration } from "./quick";

describe("buildQuickSegments", () => {
  it("returns a 3s prep lead-in followed by the requested hold", () => {
    expect(buildQuickSegments(60)).toEqual([
      { label: "Get ready", seconds: 3, prep: true },
      { label: "", seconds: 60 },
    ]);
  });
});

describe("buildQuickPerSideSegments", () => {
  it("returns 3s prep then two holds separated by a switch buffer", () => {
    expect(buildQuickPerSideSegments(30)).toEqual([
      { label: "Get ready", seconds: 3, prep: true },
      { label: "", seconds: 30 },
      { label: "Switch sides", seconds: 5, prep: true },
      { label: "", seconds: 30 },
    ]);
  });
});

describe("formatDuration", () => {
  it("renders sub-minute durations in seconds", () => {
    expect(formatDuration(45)).toBe("45 sec");
  });

  it("renders exact minutes without seconds", () => {
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(120)).toBe("2 min");
  });

  it("renders mixed durations as minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1 min 30 sec");
  });
});
