import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { moveItem, removeItem } from '@/routines/routines';
import { deleteRoutine, updateRoutine, useRoutines } from '@/routines/store';
import { stretches } from '@/stretches/library';
import { formatDuration, optionDuration } from '@/stretches/segments';

export default function RoutineBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const routine = useRoutines().find((r) => r.id === id);

  if (!routine) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Routine not found.</ThemedText>
      </ThemedView>
    );
  }

  const onDelete = () => {
    deleteRoutine(routine.id);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit routine' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={routine.name}
          onChangeText={(name) => updateRoutine(routine.id, (r) => ({ ...r, name }))}
          placeholder="Routine name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.name, { color: theme.text, borderColor: theme.border }]}
        />

        <View style={styles.items}>
          {routine.items.map((item, index) => {
            const stretch = stretches.find((s) => s.id === item.stretchId);
            const option = stretch?.options[item.optionIndex];
            const perSide = option?.kind === 'perSide';
            return (
              <ThemedView key={index} type="backgroundElement" bordered style={styles.item}>
                <View style={styles.itemText}>
                  <ThemedText numberOfLines={1}>{stretch?.name ?? 'Unknown'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {option ? formatDuration(optionDuration(option)) : ''}
                    {perSide ? ' · per side' : ''}
                  </ThemedText>
                </View>
                <View style={styles.itemActions}>
                  <Pressable
                    disabled={index === 0}
                    onPress={() => updateRoutine(routine.id, (r) => moveItem(r, index, index - 1))}
                    hitSlop={8}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView
                      name="chevron.up"
                      tintColor={index === 0 ? theme.backgroundSelected : theme.textSecondary}
                      size={18}
                    />
                  </Pressable>
                  <Pressable
                    disabled={index === routine.items.length - 1}
                    onPress={() => updateRoutine(routine.id, (r) => moveItem(r, index, index + 1))}
                    hitSlop={8}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView
                      name="chevron.down"
                      tintColor={
                        index === routine.items.length - 1
                          ? theme.backgroundSelected
                          : theme.textSecondary
                      }
                      size={18}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => updateRoutine(routine.id, (r) => removeItem(r, index))}
                    hitSlop={8}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView name="minus.circle.fill" tintColor={theme.textSecondary} size={24} />
                  </Pressable>
                </View>
              </ThemedView>
            );
          })}

          <Pressable
            onPress={() => router.push({ pathname: '/routine/add/[id]', params: { id: routine.id } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" bordered style={styles.addRow}>
              <SymbolView name="plus" tintColor={theme.accent} size={18} />
              <ThemedText>Add stretch</ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <Pressable
          disabled={routine.items.length === 0}
          onPress={() => router.push({ pathname: '/run', params: { routine: routine.id } })}
          style={({ pressed }) => pressed && styles.pressed}>
          <View
            style={[
              styles.start,
              { backgroundColor: theme.accent },
              routine.items.length === 0 && styles.disabled,
            ]}>
            <SymbolView name="play.fill" tintColor={theme.accentForeground} size={18} />
            <ThemedText type="default" style={{ color: theme.accentForeground, fontWeight: '600' }}>
              Start routine
            </ThemedText>
          </View>
        </Pressable>

        <Pressable onPress={onDelete} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.delete}>
            Delete routine
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  name: {
    fontSize: 24,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
  },
  items: { gap: Spacing.two },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  itemText: { flex: 1, gap: Spacing.half },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  disabled: { opacity: 0.4 },
  delete: { textAlign: 'center', paddingTop: Spacing.three },
  pressed: { opacity: 0.6 },
});
