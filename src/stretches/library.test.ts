import { describe, expect, it } from "bun:test";
import { stretches } from "./library";
import { buildSegments, optionDuration } from "./segments";

describe("stretch library", () => {
  it("ships a curated set of stretches", () => {
    expect(stretches.length).toBeGreaterThanOrEqual(12);
  });

  it("uses unique ids", () => {
    const ids = stretches.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every stretch at least one time option", () => {
    for (const stretch of stretches) {
      expect(stretch.options.length).toBeGreaterThan(0);
    }
  });

  it("gives every stretch instructions and target muscles", () => {
    for (const stretch of stretches) {
      expect(stretch.instructions.length).toBeGreaterThan(0);
      expect(stretch.muscles.length).toBeGreaterThan(0);
    }
  });

  it("builds runnable, non-empty segments for every option", () => {
    for (const stretch of stretches) {
      for (const option of stretch.options) {
        const segments = buildSegments(stretch, option);

        expect(segments.length).toBeGreaterThan(0);
        expect(optionDuration(option)).toBeGreaterThan(0);
        for (const segment of segments) {
          expect(segment.seconds).toBeGreaterThan(0);
          expect(segment.label.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
