import { describe, expect, it } from "bun:test";
import { stretches } from "./library";
import { MUSCLE_GROUPS, filterStretches } from "./muscles";
import type { Stretch } from "./segments";

const make = (id: string, muscles: string[], name = id): Stretch => ({
  id,
  name,
  image: id,
  instructions: ["x"],
  muscles,
  options: [{ kind: "hold", seconds: 30 }],
});

const lib = [
  make("hammy", ["hamstrings"], "Hamstring"),
  make("cobra", ["lower back"], "Cobra"),
  make("tri", ["triceps"], "Triceps"),
];

describe("filterStretches", () => {
  it("returns everything when there is no query and no group selected", () => {
    expect(filterStretches(lib, "", []).length).toBe(3);
  });

  it("filters by muscle group, OR-ing across selected groups", () => {
    expect(filterStretches(lib, "", ["Legs"]).map((s) => s.id)).toEqual(["hammy"]);
    expect(filterStretches(lib, "", ["Legs", "Back"]).map((s) => s.id).sort()).toEqual([
      "cobra",
      "hammy",
    ]);
  });

  it("filters by text query against name or muscle", () => {
    expect(filterStretches(lib, "tricep", []).map((s) => s.id)).toEqual(["tri"]);
    expect(filterStretches(lib, "hamstring", []).map((s) => s.id)).toEqual(["hammy"]);
  });

  it("applies query AND group together", () => {
    expect(filterStretches(lib, "ham", ["Back"]).length).toBe(0);
    expect(filterStretches(lib, "ham", ["Legs"]).map((s) => s.id)).toEqual(["hammy"]);
  });
});

describe("MUSCLE_GROUPS", () => {
  it("covers every muscle that appears in the real library", () => {
    const mapped = new Set(MUSCLE_GROUPS.flatMap((g) => g.muscles));
    for (const stretch of stretches) {
      for (const muscle of stretch.muscles) {
        expect(mapped.has(muscle)).toBe(true);
      }
    }
  });
});
