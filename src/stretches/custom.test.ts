import { describe, expect, it } from "bun:test";
import { isCustomStretch, makeCustomStretch, mergeStretches } from "./custom";

describe("makeCustomStretch", () => {
  it("builds a hold stretch with a custom- id and longest-first options", () => {
    const stretch = makeCustomStretch(
      { name: "Couch Stretch", perSide: false, seconds: [30, 60], muscles: ["quadriceps"] },
      []
    );

    expect(stretch).toEqual({
      id: "custom-couch-stretch",
      name: "Couch Stretch",
      image: "custom-couch-stretch",
      instructions: [],
      muscles: ["quadriceps"],
      options: [
        { kind: "hold", seconds: 60 },
        { kind: "hold", seconds: 30 },
      ],
    });
  });

  it("trims the name and dodges taken ids with a numeric suffix", () => {
    const stretch = makeCustomStretch(
      { name: "  Couch Stretch ", perSide: false, seconds: [30], muscles: [] },
      ["custom-couch-stretch", "custom-couch-stretch-2"]
    );

    expect(stretch.name).toBe("Couch Stretch");
    expect(stretch.id).toBe("custom-couch-stretch-3");
  });

  it("builds per-side options for two-sided stretches", () => {
    const stretch = makeCustomStretch(
      { name: "Pigeon", perSide: true, seconds: [20, 45], muscles: ["glutes"] },
      []
    );

    expect(stretch.options).toEqual([
      { kind: "perSide", secondsPerSide: 45 },
      { kind: "perSide", secondsPerSide: 20 },
    ]);
  });
});

describe("mergeStretches", () => {
  it("interleaves custom stretches into the library sorted by name", () => {
    const lib = [
      makeCustomStretch({ name: "Adductor", perSide: false, seconds: [30], muscles: [] }, []),
      makeCustomStretch({ name: "Side Lying Quad", perSide: true, seconds: [30], muscles: [] }, []),
    ];
    const custom = [
      makeCustomStretch({ name: "Couch Stretch", perSide: true, seconds: [60], muscles: [] }, []),
    ];

    expect(mergeStretches(lib, custom).map((s) => s.name)).toEqual([
      "Adductor",
      "Couch Stretch",
      "Side Lying Quad",
    ]);
  });
});

describe("isCustomStretch", () => {
  it("recognises custom ids and rejects library ids", () => {
    expect(isCustomStretch("custom-couch-stretch")).toBe(true);
    expect(isCustomStretch("cat-stretch")).toBe(false);
  });
});
