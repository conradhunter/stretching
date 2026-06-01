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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stretches',
          tabBarIcon: ({ color }) => (
            <SymbolView name="figure.flexibility" tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarIcon: ({ color }) => (
            <SymbolView name="list.bullet" tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="quick"
        options={{
          title: 'Quick',
          tabBarIcon: ({ color }) => (
            <SymbolView name="bolt.fill" tintColor={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
