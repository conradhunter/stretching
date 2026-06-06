import { describe, expect, it } from "bun:test";
import { dropReason } from "./prune";

const make = (over: Partial<{ id: string; name: string; instructions: string[] }> = {}) => ({
  id: "calf-stretch",
  name: "Calf Stretch",
  instructions: ["Stand facing a wall.", "Hold the stretch."],
  ...over,
});

describe("dropReason", () => {
  it("drops foam-rolling SMR entries", () => {
    expect(dropReason(make({ id: "calves-smr", name: "Calves-SMR" }))).toBe("foam rolling (SMR)");
  });

  it("drops stretches that need a partner", () => {
    const stretch = make({
      id: "lying-hamstring",
      name: "Lying Hamstring",
      instructions: ["Lie on your back.", "Have your partner hold the ankle."],
    });
    expect(dropReason(stretch)).toBe("needs a partner");
  });

  it("drops rep-based dynamic movements", () => {
    const stretch = make({
      id: "wrist-circles",
      name: "Wrist Circles",
      instructions: ["Rotate your wrists.", "Repeat for 10-20 repetitions."],
    });
    expect(dropReason(stretch)).toBe("rep-based movement, not a timed hold");
  });

  it("keeps genuine timed holds", () => {
    expect(dropReason(make())).toBeNull();
  });

  it("KEEP rescues an entry the heuristics would drop", () => {
    const stretch = make({
      id: "superman",
      name: "Superman",
      instructions: ["Raise your arms and legs.", "Repeat for 10 repetitions."],
    });
    expect(dropReason(stretch)).toBeNull();
  });
});
