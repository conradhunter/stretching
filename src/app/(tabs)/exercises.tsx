import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalHeader } from '@/components/goal-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { EXERCISES, sessionSeconds, type Exercise } from '@/exercises/exercises';
import { repsOn } from '@/exercises/log';
import { useExerciseLog } from '@/exercises/store';
import { useTheme } from '@/hooks/use-theme';
import { useTracking } from '@/tracking/store';
import { formatDuration } from '@/timer/quick';
import { useTodayLocalDate } from '@/tracking/today';

export default function ExercisesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const log = useExerciseLog();
  const tracking = useTracking();
  const today = useTodayLocalDate();

  const [exercise, setExercise] = useState<Exercise>(EXERCISES[0]);
  const [reps, setReps] = useState<number>(EXERCISES[0].presets[0]);

  // Rep presets are per-exercise (10 push-ups and 10 pull-ups aren't the same
  // ask), so switching exercise moves the selection to the new list's default.
  const pickExercise = (next: Exercise) => {
    Haptics.selectionAsync();
    setExercise(next);
    if (!next.presets.includes(reps)) setReps(next.presets[0]);
  };

  const done = repsOn(log, today, exercise.id);
  const target = tracking.repTargets[exercise.id] ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Same header as Quick: a rep target added to the daily goal is only
            honest if today's standing is visible where the reps get done. */}
        <GoalHeader title="Exercises" />

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Exercise
        </ThemedText>
        <ThemedView type="backgroundElement" bordered style={styles.segmented}>
          {EXERCISES.map((option) => {
            const active = option.id === exercise.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => pickExercise(option)}
                style={({ pressed }) => [
                  styles.segment,
                  active && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <SymbolView
                  name={option.symbol as SymbolViewProps['name']}
                  tintColor={active ? theme.text : theme.textSecondary}
                  size={20}
                />
                <ThemedText
                  type="small"
                  themeColor={active ? undefined : 'textSecondary'}
                  style={active ? styles.segmentTextActive : undefined}>
                  {option.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Reps
        </ThemedText>
        <ThemedView type="backgroundElement" bordered style={styles.segmented}>
          {exercise.presets.map((option) => {
            const active = option === reps;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  Haptics.selectionAsync();
                  setReps(option);
                }}
                style={({ pressed }) => [
                  styles.segment,
                  styles.repSegment,
                  active && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  style={[styles.repText, { color: active ? theme.text : theme.textSecondary }]}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/exercise-run',
              params: { id: exercise.id, reps: String(reps) },
            })
          }
          style={({ pressed }) => [styles.startWrap, pressed && styles.pressed]}>
          <View style={[styles.start, { backgroundColor: theme.accent }]}>
            <ThemedText style={[styles.startText, { color: theme.accentForeground }]}>
              Start {reps} {exercise.name.toLowerCase()}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.accentForeground, opacity: 0.8 }}>
              {formatDuration(sessionSeconds(exercise, reps))} at this pace
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText
          type="small"
          themeColor={target > 0 && done >= target ? undefined : 'textSecondary'}
          style={styles.todayLine}>
          {target > 0
            ? `${done} of ${target} ${exercise.name.toLowerCase()} today${done >= target ? ' ✓' : ''}`
            : done > 0
              ? `${done} ${exercise.name.toLowerCase()} today`
              : `No ${exercise.name.toLowerCase()} yet today`}
        </ThemedText>

        <View style={[styles.summary, { borderTopColor: theme.border }]}>
          {EXERCISES.map((option) => {
            const count = repsOn(log, today, option.id);
            const goal = tracking.repTargets[option.id] ?? 0;
            return (
              <View key={option.id} style={styles.summaryCell}>
                <ThemedText style={styles.summaryCount}>
                  {count}
                  {goal > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {' '}
                      / {goal}
                    </ThemedText>
                  )}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {option.name}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  sectionLabel: { marginTop: Spacing.three, marginBottom: Spacing.two },
  segmented: { flexDirection: 'row', borderRadius: Radius.lg, overflow: 'hidden' },
  segment: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  repSegment: { paddingVertical: Spacing.two },
  segmentTextActive: { fontWeight: '600' },
  repText: { fontSize: 22, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  startWrap: { marginTop: Spacing.four },
  start: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  startText: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  todayLine: { textAlign: 'center', marginTop: Spacing.three },
  summary: {
    marginTop: 'auto',
    marginBottom: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: BorderWidth,
    flexDirection: 'row',
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: Spacing.half },
  summaryCount: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
});
