import { describe, expect, it } from "bun:test";
import { createTimer, pause, previous, resume, skip, tick } from "./engine";

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

describe("elapsedStretchSeconds", () => {
  it("starts at zero", () => {
    expect(createTimer([{ label: "hold", seconds: 30 }]).elapsedStretchSeconds).toBe(0);
  });

  it("counts each ticked second of a normal (non-prep) segment", () => {
    let state = createTimer([{ label: "hold", seconds: 30 }]);
    state = tick(state).state;
    state = tick(state).state;

    expect(state.elapsedStretchSeconds).toBe(2);
  });

  it("does not count ticks during a prep segment", () => {
    let state = createTimer([{ label: "Get ready", seconds: 3, prep: true }]);
    state = tick(state).state;
    state = tick(state).state;

    expect(state.elapsedStretchSeconds).toBe(0);
  });

  it("still credits the final second that ends a segment", () => {
    const { state } = tick(createTimer([{ label: "hold", seconds: 1 }]));

    expect(state.status).toBe("completed");
    expect(state.elapsedStretchSeconds).toBe(1);
  });

  it("does not credit skipped time", () => {
    const { state } = skip(
      createTimer([{ label: "right", seconds: 30 }, { label: "left", seconds: 30 }])
    );

    expect(state.elapsedStretchSeconds).toBe(0);
  });

  it("does not count while paused", () => {
    const paused = pause(createTimer([{ label: "hold", seconds: 30 }]));

    expect(tick(paused).state.elapsedStretchSeconds).toBe(0);
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

describe("previous", () => {
  it("jumps back to the start of the prior segment", () => {
    const right = { label: "right leg", seconds: 30 };
    const left = { label: "left leg", seconds: 30 };
    const onLeft = skip(createTimer([right, left])).state;
    const { state, events } = previous(onLeft);

    expect(state.segmentIndex).toBe(0);
    expect(state.remaining).toBe(30);
    expect(state.status).toBe("running");
    expect(events).toEqual([{ type: "segment-advance", index: 0, segment: right }]);
  });

  it("restarts the current segment when already at the first", () => {
    const ticked = tick(createTimer([{ label: "hold", seconds: 30 }])).state;
    expect(ticked.remaining).toBe(29);

    const { state } = previous(ticked);
    expect(state.segmentIndex).toBe(0);
    expect(state.remaining).toBe(30);
  });

  it("preserves paused status", () => {
    const onSecond = skip(createTimer([{ label: "a", seconds: 30 }, { label: "b", seconds: 30 }])).state;
    const { state } = previous(pause(onSecond));

    expect(state.status).toBe("paused");
    expect(state.segmentIndex).toBe(0);
  });

  it("is a no-op once completed", () => {
    const done = tick(createTimer([{ label: "hold", seconds: 1 }])).state;
    const { state, events } = previous(done);

    expect(state).toEqual(done);
    expect(events).toEqual([]);
  });

  it("does not change elapsed stretched seconds", () => {
    const ticked = tick(createTimer([{ label: "a", seconds: 30 }, { label: "b", seconds: 30 }])).state;
    const onSecond = skip(ticked).state;
    const { state } = previous(onSecond);

    expect(state.elapsedStretchSeconds).toBe(1);
  });
});
