export type Rect = { x: number; y: number; width: number; height: number };

/** The frame a `contain`-fit image of `imgW`x`imgH` occupies on a `screenW`x`screenH` screen, centered. */
export function containRect(imgW: number, imgH: number, screenW: number, screenH: number): Rect {
  "worklet";
  const scale = Math.min(screenW / imgW, screenH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (screenW - width) / 2, y: (screenH - height) / 2, width, height };
}

/** Clamps a page index into the valid range `[0, count-1]`. */
export function clampIndex(index: number, count: number): number {
  return Math.max(0, Math.min(index, count - 1));
}

/** Linear interpolation between two frames; `t=0` returns `from`, `t=1` returns `to`. */
export function lerpRect(from: Rect, to: Rect, t: number): Rect {
  "worklet";
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    width: mix(from.width, to.width),
    height: mix(from.height, to.height),
  };
}
