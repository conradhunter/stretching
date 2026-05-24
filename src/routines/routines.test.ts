import { describe, expect, it } from "bun:test";
import { addItem, buildRoutineSegments, moveItem, removeItem, type Routine } from "./routines";

describe("buildRoutineSegments", () => {
  const items = [
    { stretch: { name: "Cat / Cow", image: "cat-cow" }, option: { kind: "hold" as const, seconds: 30 } },
    { stretch: { name: "Quad", image: "quad" }, option: { kind: "perSide" as const, secondsPerSide: 30 } },
  ];

  it("prepends a 10s 'Next: …' prep before each stretch and carries its image", () => {
    expect(buildRoutineSegments(items)).toEqual([
      { label: "Next: Cat / Cow", seconds: 10, image: "cat-cow" },
      { label: "Cat / Cow", seconds: 30, image: "cat-cow" },
      { label: "Next: Quad", seconds: 10, image: "quad" },
      { label: "Quad — right side", seconds: 30, image: "quad" },
      { label: "Quad — left side", seconds: 30, image: "quad" },
    ]);
  });

  it("uses a configurable prep length", () => {
    const segments = buildRoutineSegments(items.slice(0, 1), 5);
    expect(segments[0]).toEqual({ label: "Next: Cat / Cow", seconds: 5, image: "cat-cow" });
  });
});

describe("routine item mutations", () => {
  const base: Routine = { id: "r1", name: "Morning", items: [{ stretchId: "quad", optionIndex: 0 }] };

  it("appends an item without mutating the original", () => {
    const next = addItem(base, { stretchId: "cat-cow", optionIndex: 1 });

    expect(next.items).toEqual([
      { stretchId: "quad", optionIndex: 0 },
      { stretchId: "cat-cow", optionIndex: 1 },
    ]);
    expect(base.items).toHaveLength(1);
  });

  it("removes an item by index", () => {
    const next = removeItem(base, 0);
    expect(next.items).toEqual([]);
  });
});

describe("moveItem", () => {
  const r: Routine = {
    id: "r1",
    name: "Morning",
    items: [
      { stretchId: "a", optionIndex: 0 },
      { stretchId: "b", optionIndex: 0 },
      { stretchId: "c", optionIndex: 0 },
    ],
  };

  it("moves an item to a new position without mutating the original", () => {
    expect(moveItem(r, 0, 1).items.map((i) => i.stretchId)).toEqual(["b", "a", "c"]);
    expect(moveItem(r, 2, 0).items.map((i) => i.stretchId)).toEqual(["c", "a", "b"]);
    expect(r.items.map((i) => i.stretchId)).toEqual(["a", "b", "c"]);
  });

  it("is a no-op when the target index is out of bounds", () => {
    expect(moveItem(r, 0, -1)).toBe(r);
    expect(moveItem(r, 2, 3)).toBe(r);
  });
});
