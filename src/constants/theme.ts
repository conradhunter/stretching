/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// shadcn-style neutral (zinc) palette. Surfaces are defined by the page
// background + a hairline `border`; `accent` is the single brand color.
export const Colors = {
  light: {
    text: '#09090b', // zinc-950 (foreground)
    background: '#ffffff',
    backgroundElement: '#ffffff', // card surface — distinguished by border, not fill
    backgroundSelected: '#f4f4f5', // zinc-100 (pressed / subtle fill)
    textSecondary: '#71717a', // zinc-500 (muted foreground)
    border: '#e4e4e7', // zinc-200
    accent: '#2563eb', // blue-600
    accentForeground: '#ffffff',
  },
  dark: {
    text: '#fafafa', // zinc-50
    background: '#09090b', // zinc-950
    backgroundElement: '#09090b', // card surface — distinguished by border, not fill
    backgroundSelected: '#27272a', // zinc-800 (pressed / subtle fill)
    textSecondary: '#a1a1aa', // zinc-400 (muted foreground)
    border: '#27272a', // zinc-800
    accent: '#3b82f6', // blue-500 (brighter for dark surfaces)
    accentForeground: '#ffffff',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii (shadcn-ish): inputs/buttons `md`, cards `lg`, pills `full`. */
export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

/** Hairline border used on all surfaces (cards, inputs, pills). */
export const BorderWidth = 1;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
