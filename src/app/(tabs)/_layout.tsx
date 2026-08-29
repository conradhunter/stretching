import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { BorderWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: BorderWidth,
        },
      }}>
      {/* Quick is the `index` route so a cold launch (which always opens "/")
          lands on it. Bar order: Quick / Exercises. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Quick',
          tabBarIcon: ({ color }) => (
            <SymbolView name="bolt.fill" tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color }) => (
            <SymbolView name="figure.strengthtraining.traditional" tintColor={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
