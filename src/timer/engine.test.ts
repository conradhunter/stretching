import { describe, expect, it } from "bun:test";
import { createTimer, pause, resume, skip, tick } from "./engine";

describe("createTimer", () => {
  it("starts running at the first segment", () => {
    const state = createTimer([{ label: "hold", seconds: 30 }]);

    expect(state.status).toBe("running");
    expect(state.segmentIndex).toBe(0);
    expect(state.remaining).toBe(30);
  });
});

describe("tick", () => {
  it("counts down one second of the current segment", () => {
    const { state } = tick(createTimer([{ label: "hold", seconds: 30 }]));

    expect(state.remaining).toBe(29);
    expect(state.status).toBe("running");
  });

  it("completes when the only segment runs out", () => {
    const { state, events } = tick(createTimer([{ label: "hold", seconds: 1 }]));

    expect(state.status).toBe("completed");
    expect(state.remaining).toBe(0);
    expect(events).toEqual([{ type: "completed" }]);
  });

  it("advances to the next segment when one runs out (switch sides)", () => {
    const right = { label: "right leg", seconds: 1 };
    const left = { label: "left leg", seconds: 30 };
    const { state, events } = tick(createTimer([right, left]));

    expect(state.status).toBe("running");
    expect(state.segmentIndex).toBe(1);
    expect(state.remaining).toBe(30);
    expect(events).toEqual([{ type: "segment-advance", index: 1, segment: left }]);
  });

  it("is a no-op once completed", () => {
    const done = tick(createTimer([{ label: "hold", seconds: 1 }])).state;
    const { state, events } = tick(done);

    expect(state).toEqual(done);
    expect(events).toEqual([]);
  });
});

describe("pause / resume", () => {
  it("freezes the countdown while paused and continues after resume", () => {
    const paused = pause(createTimer([{ label: "hold", seconds: 30 }]));
    expect(paused.status).toBe("paused");

    const stillPaused = tick(paused).state;
    expect(stillPaused.remaining).toBe(30);

    const resumed = resume(stillPaused);
    expect(resumed.status).toBe("running");
    expect(tick(resumed).state.remaining).toBe(29);
  });
});

describe("skip", () => {
  it("jumps to the next segment immediately", () => {
    const left = { label: "left leg", seconds: 30 };
    const { state, events } = skip(
      createTimer([{ label: "right leg", seconds: 30 }, left])
    );

    expect(state.segmentIndex).toBe(1);
    expect(state.remaining).toBe(30);
    expect(state.status).toBe("running");
    expect(events).toEqual([{ type: "segment-advance", index: 1, segment: left }]);
  });

  it("completes the timer when skipping the last segment", () => {
    const { state, events } = skip(createTimer([{ label: "hold", seconds: 30 }]));

    expect(state.status).toBe("completed");
    expect(events).toEqual([{ type: "completed" }]);
  });
});
