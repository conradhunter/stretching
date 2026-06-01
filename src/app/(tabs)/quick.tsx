import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DURATIONS: { label: string; seconds: number }[] = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
  { label: '1m 30s', seconds: 90 },
];

export default function QuickScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Quick</ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Single hold
        </ThemedText>
        <View style={styles.grid}>
          {DURATIONS.map(({ label, seconds }) => (
            <Pressable
              key={`single-${seconds}`}
              onPress={() => router.push({ pathname: '/run', params: { seconds: String(seconds) } })}
              style={({ pressed }) => [styles.chipWrap, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" bordered style={styles.chip}>
                <ThemedText style={[styles.chipText, { color: theme.text }]}>{label}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Both sides
        </ThemedText>
        <View style={styles.grid}>
          {DURATIONS.map(({ label, seconds }) => (
            <Pressable
              key={`perside-${seconds}`}
              onPress={() => router.push({ pathname: '/run', params: { perSide: String(seconds) } })}
              style={({ pressed }) => [styles.chipWrap, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" bordered style={styles.chip}>
                <ThemedText style={[styles.chipText, { color: theme.text }]}>{label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.chipSub}>
                  per side
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: { paddingTop: Spacing.two, paddingBottom: Spacing.three },
  sectionLabel: { marginTop: Spacing.two, marginBottom: Spacing.two },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.two,
    rowGap: Spacing.two,
  },
  chipWrap: { width: '48%' },
  chip: {
    height: 96,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  chipText: { fontSize: 26, lineHeight: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chipSub: { marginTop: 0 },
  pressed: { opacity: 0.6 },
});
