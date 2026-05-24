import type { Segment } from "../timer/engine";

export type TimeOption =
  | { kind: "hold"; seconds: number }
  | { kind: "perSide"; secondsPerSide: number };

export type Stretch = {
  id: string;
  name: string;
  image: string;
  instructions: string[];
  muscles: string[];
  options: TimeOption[];
};

export function buildSegments(stretch: Pick<Stretch, "name">, option: TimeOption): Segment[] {
  if (option.kind === "hold") {
    return [{ label: stretch.name, seconds: option.seconds }];
  }

  return [
    { label: `${stretch.name} — right side`, seconds: option.secondsPerSide },
    { label: `${stretch.name} — left side`, seconds: option.secondsPerSide },
  ];
}

export function optionDuration(option: TimeOption): number {
  return option.kind === "hold" ? option.seconds : option.secondsPerSide * 2;
}

export function withLeadIn(segments: Segment[], leadIn: Segment): Segment[] {
  return [leadIn, ...segments];
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}
