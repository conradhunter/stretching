import { type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  /** 0..1; clamped. Drives how many ticks are lit. */
  fraction: number;
  trackColor: string;
  fillColor: string;
  size?: number;
  tickCount?: number;
  tickLength?: number;
  tickWidth?: number;
  /** Centered content (e.g. flame + streak number). */
  children?: ReactNode;
};

/**
 * A segmented progress dial built from plain Views — N radial ticks around a
 * circle, the first `fraction × N` lit. No SVG / native dep, so it hot-reloads
 * in the existing dev client. Lights clockwise from 12 o'clock.
 */
export function ProgressRing({
  fraction,
  trackColor,
  fillColor,
  size = 46,
  tickCount = 40,
  tickLength = 6,
  tickWidth = 2,
  children,
}: Props) {
  const f = Math.max(0, Math.min(1, fraction));
  const lit = f >= 1 ? tickCount : Math.round(f * tickCount);
  const radius = size / 2;
  const translateY = -(radius - tickLength / 2);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: tickCount }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: tickWidth,
            height: tickLength,
            borderRadius: tickWidth / 2,
            backgroundColor: i < lit ? fillColor : trackColor,
            transform: [{ rotate: `${(i / tickCount) * 360}deg` }, { translateY }],
          }}
        />
      ))}
      {children}
    </View>
  );
}
