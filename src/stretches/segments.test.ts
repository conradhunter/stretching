import { describe, expect, it } from "bun:test";
import { buildSegments, formatDuration, optionDuration, withLeadIn } from "./segments";

const catCow = { id: "cat-cow", name: "Cat / Cow", image: "cat-cow", options: [] };
const quad = { id: "quad", name: "Quad", image: "quad", options: [] };

describe("buildSegments", () => {
  it("expands a hold into a single segment labelled with the stretch name", () => {
    const segments = buildSegments(catCow, { kind: "hold", seconds: 30 });

    expect(segments).toEqual([{ label: "Cat / Cow", seconds: 30 }]);
  });

  it("expands a perSide option into right then left segments", () => {
    const segments = buildSegments(quad, { kind: "perSide", secondsPerSide: 30 });

    expect(segments).toEqual([
      { label: "Quad — right side", seconds: 30 },
      { label: "Quad — left side", seconds: 30 },
    ]);
  });
});

describe("optionDuration", () => {
  it("totals a hold as its own seconds", () => {
    expect(optionDuration({ kind: "hold", seconds: 45 })).toBe(45);
  });

  it("totals a perSide as both sides combined", () => {
    expect(optionDuration({ kind: "perSide", secondsPerSide: 30 })).toBe(60);
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

describe("withLeadIn", () => {
  it("prepends a lead-in segment before the work segments", () => {
    const work = [
      { label: "Quad — right side", seconds: 30 },
      { label: "Quad — left side", seconds: 30 },
    ];

    expect(withLeadIn(work, { label: "Get ready", seconds: 3 })).toEqual([
      { label: "Get ready", seconds: 3 },
      { label: "Quad — right side", seconds: 30 },
      { label: "Quad — left side", seconds: 30 },
    ]);
  });
});
