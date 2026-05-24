import { describe, expect, it } from "bun:test";
import { clampIndex, containRect, lerpRect, type Rect } from "./geometry";

describe("containRect", () => {
  it("fits a landscape image to the screen width, centered vertically (letterboxed)", () => {
    // 850x567 image (~1.5:1) in a 400x800 portrait screen -> width-bound.
    const r = containRect(850, 567, 400, 800);
    expect(r.x).toBeCloseTo(0);
    expect(r.width).toBeCloseTo(400);
    expect(r.height).toBeCloseTo(266.82, 1);
    expect(r.y).toBeCloseTo((800 - 266.82) / 2, 1);
  });

  it("fits a tall image to the screen height, centered horizontally (pillarboxed)", () => {
    // 400x800 image in a 400x400 screen -> height-bound.
    const r = containRect(400, 800, 400, 400);
    expect(r.y).toBeCloseTo(0);
    expect(r.height).toBeCloseTo(400);
    expect(r.width).toBeCloseTo(200);
    expect(r.x).toBeCloseTo((400 - 200) / 2);
  });
});

describe("lerpRect", () => {
  const thumb: Rect = { x: 16, y: 100, width: 64, height: 64 };
  const full: Rect = { x: 0, y: 266, width: 400, height: 267 };

  it("returns the source frame at t=0 and the target frame at t=1", () => {
    expect(lerpRect(thumb, full, 0)).toEqual(thumb);
    expect(lerpRect(thumb, full, 1)).toEqual(full);
  });

  it("interpolates each edge linearly at t=0.5", () => {
    const r = lerpRect(thumb, full, 0.5);
    expect(r.x).toBeCloseTo(8);
    expect(r.y).toBeCloseTo(183);
    expect(r.width).toBeCloseTo(232);
    expect(r.height).toBeCloseTo(165.5);
  });
});

describe("clampIndex", () => {
  it("keeps an index within [0, count-1]", () => {
    expect(clampIndex(1, 2)).toBe(1);
    expect(clampIndex(-1, 2)).toBe(0);
    expect(clampIndex(5, 2)).toBe(1);
  });
});
