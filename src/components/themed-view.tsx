import { View, type ViewProps } from 'react-native';

import { BorderWidth, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Adds a hairline `border`-colored outline — the shadcn surface treatment. */
  bordered?: boolean;
};

export function ThemedView({ style, lightColor, darkColor, type, bordered, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        bordered && { borderWidth: BorderWidth, borderColor: theme.border },
        style,
      ]}
      {...otherProps}
    />
  );
}
