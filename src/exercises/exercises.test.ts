import { describe, expect, it } from "bun:test";
import {
  EXERCISES,
  READY_SECONDS,
  buildRepSegments,
  currentRep,
  getExercise,
  repsCompletedAt,
  sessionSeconds,
} from "./exercises";

const pushups = getExercise("pushups")!;

describe("EXERCISES", () => {
  it("covers push-ups, crunches and pull-ups, each with rep presets", () => {
    expect(EXERCISES.map((e) => e.id)).toEqual(["pushups", "crunches", "pullups"]);
    for (const exercise of EXERCISES) {
      expect(exercise.presets.length).toBeGreaterThan(0);
      expect(exercise.secondsPerPhase).toBeGreaterThan(0);
    }
  });
});

describe("getExercise", () => {
  it("finds an exercise by id and returns undefined for anything else", () => {
    expect(getExercise("crunches")?.name).toBe("Crunches");
    expect(getExercise("burpees")).toBeUndefined();
  });
});

describe("buildRepSegments", () => {
  it("paces each rep as its two phases, behind a get-ready lead-in", () => {
    const segments = buildRepSegments(pushups, 2);

    expect(segments).toEqual([
      { label: "Get ready", seconds: READY_SECONDS, prep: true },
      { label: "Down", seconds: 2 },
      { label: "Up", seconds: 2 },
      { label: "Down", seconds: 2 },
      { label: "Up", seconds: 2 },
    ]);
  });

  it("refuses a non-positive rep count", () => {
    expect(buildRepSegments(pushups, 0)).toEqual([]);
  });
});

describe("sessionSeconds", () => {
  it("totals the lead-in plus both phases of every rep", () => {
    expect(sessionSeconds(pushups, 10)).toBe(READY_SECONDS + 10 * 4);
  });
});

describe("repsCompletedAt", () => {
  // Segment 0 is the lead-in; a rep only counts once both its phases are done.
  it("counts a rep only when its second phase has finished", () => {
    expect(repsCompletedAt(0)).toBe(0); // get ready
    expect(repsCompletedAt(1)).toBe(0); // rep 1, down
    expect(repsCompletedAt(2)).toBe(0); // rep 1, up
    expect(repsCompletedAt(3)).toBe(1); // rep 2, down
    expect(repsCompletedAt(5)).toBe(2); // rep 3, down
  });
});

describe("currentRep", () => {
  it("numbers the rep in progress, and holds at the last one when finished", () => {
    expect(currentRep(0, 10)).toBe(1); // still getting ready
    expect(currentRep(1, 10)).toBe(1);
    expect(currentRep(2, 10)).toBe(1);
    expect(currentRep(3, 10)).toBe(2);
    expect(currentRep(20, 10)).toBe(10);
  });
});
