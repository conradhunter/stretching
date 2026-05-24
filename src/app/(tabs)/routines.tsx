import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function RoutinesScreen() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <SymbolView name="list.bullet.rectangle" tintColor={theme.textSecondary} size={48} />
        <ThemedText type="subtitle">Routines</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          Build a routine by chaining stretches with their time options. Coming next.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  body: { textAlign: 'center' },
});
