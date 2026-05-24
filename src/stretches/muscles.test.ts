import { describe, expect, it } from "bun:test";
import {
  allMuscles,
  expandMuscleSelection,
  filterStretches,
  isMuscleGroup,
  muscleLabel,
  orderByUsage,
} from "./muscles";
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
  make("a", ["hamstrings"], "A"),
  make("b", ["hamstrings"], "B"),
  make("c", ["calves"], "Calf"),
  make("d", ["neck"], "Neck"),
];

describe("allMuscles", () => {
  it("returns distinct muscles ordered by how many stretches use them", () => {
    expect(allMuscles(lib)).toEqual(["hamstrings", "calves", "neck"]);
  });
});

describe("orderByUsage", () => {
  const base = ["hamstrings", "calves", "neck"];

  it("sorts by tap count desc, keeping base order for ties", () => {
    expect(orderByUsage(base, { neck: 5, calves: 5 })).toEqual(["calves", "neck", "hamstrings"]);
  });

  it("returns the base order when there is no usage", () => {
    expect(orderByUsage(base, {})).toEqual(base);
  });
});

describe("filterStretches", () => {
  it("returns everything with no query and no selection", () => {
    expect(filterStretches(lib, "", []).length).toBe(4);
  });

  it("filters by selected muscles, OR-ing them", () => {
    expect(filterStretches(lib, "", ["calves"]).map((s) => s.id)).toEqual(["c"]);
    expect(filterStretches(lib, "", ["calves", "neck"]).map((s) => s.id).sort()).toEqual(["c", "d"]);
  });

  it("combines query AND selection", () => {
    expect(filterStretches(lib, "calf", []).map((s) => s.id)).toEqual(["c"]);
    expect(filterStretches(lib, "calf", ["neck"]).length).toBe(0);
  });
});

describe("muscleLabel", () => {
  it("title-cases muscle names", () => {
    expect(muscleLabel("lower back")).toBe("Lower Back");
    expect(muscleLabel("hamstrings")).toBe("Hamstrings");
  });
});

describe("expandMuscleSelection", () => {
  it("expands a group token into its member muscles", () => {
    expect(expandMuscleSelection(["back"]).sort()).toEqual(["lats", "lower back", "middle back"]);
  });

  it("passes individual muscles through unchanged", () => {
    expect(expandMuscleSelection(["neck", "chest"]).sort()).toEqual(["chest", "neck"]);
  });

  it("de-duplicates when a group and one of its members are both selected", () => {
    expect(expandMuscleSelection(["back", "lats"]).sort()).toEqual([
      "lats",
      "lower back",
      "middle back",
    ]);
  });

  it("returns an empty list for an empty selection", () => {
    expect(expandMuscleSelection([])).toEqual([]);
  });
});

describe("isMuscleGroup", () => {
  it("distinguishes group names from individual muscles", () => {
    expect(isMuscleGroup("legs")).toBe(true);
    expect(isMuscleGroup("back")).toBe(true);
    expect(isMuscleGroup("lats")).toBe(false);
    expect(isMuscleGroup("lower back")).toBe(false);
  });
});
