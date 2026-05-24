import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  clearQuick,
  getQuickItems,
  moveInQuick,
  removeFromQuick,
  setQuickOption,
  useQuickRoutine,
} from '@/routines/quickRoutine';
import { createRoutine, updateRoutine } from '@/routines/store';
import { stretches } from '@/stretches/library';
import { formatDuration, optionDuration } from '@/stretches/segments';

export default function QuickRoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const items = useQuickRoutine();

  const saveAsRoutine = () => {
    const routine = createRoutine('Quick routine');
    updateRoutine(routine.id, (r) => ({ ...r, items: getQuickItems() }));
    clearQuick();
    router.replace({ pathname: '/routine/[id]', params: { id: routine.id } });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Quick routine' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No stretches yet. Tap + on a stretch to add it here.
          </ThemedText>
        ) : (
          <>
            <View style={styles.list}>
              {items.map((item, index) => {
                const stretch = stretches.find((s) => s.id === item.stretchId);
                const option = stretch?.options[item.optionIndex];
                const perSide = option?.kind === 'perSide';
                const cycle = () => {
                  if (!stretch) return;
                  setQuickOption(index, (item.optionIndex + 1) % stretch.options.length);
                };
                return (
                  <ThemedView key={index} type="backgroundElement" bordered style={styles.item}>
                    <View style={styles.itemText}>
                      <ThemedText numberOfLines={1}>{stretch?.name ?? 'Unknown'}</ThemedText>
                      <Pressable onPress={cycle} hitSlop={6}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {option ? formatDuration(optionDuration(option)) : ''}
                          {perSide ? ' · per side' : ''}
                          {stretch && stretch.options.length > 1 ? '  ⇄' : ''}
                        </ThemedText>
                      </Pressable>
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable
                        disabled={index === 0}
                        onPress={() => moveInQuick(index, index - 1)}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <SymbolView
                          name="chevron.up"
                          tintColor={index === 0 ? theme.backgroundSelected : theme.textSecondary}
                          size={18}
                        />
                      </Pressable>
                      <Pressable
                        disabled={index === items.length - 1}
                        onPress={() => moveInQuick(index, index + 1)}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <SymbolView
                          name="chevron.down"
                          tintColor={
                            index === items.length - 1 ? theme.backgroundSelected : theme.textSecondary
                          }
                          size={18}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => removeFromQuick(index)}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <SymbolView name="minus.circle.fill" tintColor={theme.textSecondary} size={24} />
                      </Pressable>
                    </View>
                  </ThemedView>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push({ pathname: '/run', params: { quick: '1' } })}
              style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.start, { backgroundColor: theme.accent }]}>
                <SymbolView name="play.fill" tintColor={theme.accentForeground} size={18} />
                <ThemedText type="default" style={{ color: theme.accentForeground, fontWeight: '600' }}>
                  Start
                </ThemedText>
              </View>
            </Pressable>

            <Pressable onPress={saveAsRoutine} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" bordered style={styles.secondary}>
                <ThemedText>Save as routine</ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={clearQuick} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.clear}>
                Clear
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', paddingTop: Spacing.six },
  list: { gap: Spacing.two },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  itemText: { flex: 1, gap: Spacing.half },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  clear: { textAlign: 'center', paddingTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
