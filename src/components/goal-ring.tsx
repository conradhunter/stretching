import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { EXERCISES, getExercise, type Exercise } from '@/exercises/exercises';
import { useExerciseLog } from '@/exercises/store';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, todayProgress, type PartProgress } from '@/tracking/streaks';
import { setExerciseTarget, setGoalMinutes, useTracking } from '@/tracking/store';
import { useTodayLocalDate } from '@/tracking/today';

const GOAL_PRESETS = [5, 10, 15, 20, 30, 45, 60];

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * A tab header with the daily goal in it: the screen title and the streak ring
 * (flame + streak count inside), then a count pill per exercise that has a rep
 * target. Anything here opens the goal sheet. The pills sit on their own row so
 * three targets can't squeeze the title.
 */
export function GoalHeader({ title }: { title: string }) {
  const theme = useTheme();
  const router = useRouter();
  const tracking = useTracking();
  const exerciseLog = useExerciseLog();
  const today = useTodayLocalDate();
  const todayReps = exerciseLog[today] ?? {};
  // The ring's fill is stretch time, but it only closes when the whole goal —
  // time plus every rep target — is met, so it can never read "done" early.
  const progress = todayProgress(
    tracking.log,
    today,
    tracking.goalSeconds,
    tracking.repTargets,
    todayReps
  );
  const streak = currentStreak(tracking.log, today, exerciseLog);
  // streaks.ts orders parts by id (it has no catalog); show them in the order
  // the sheet and the Exercises tab use, so the three lists agree.
  const parts = EXERCISES.map((e) => progress.parts.find((p) => p.exerciseId === e.id)).filter(
    (p) => p != null
  );
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <Pressable
          onPress={() => setGoalSheetOpen(true)}
          onLongPress={() => router.push('/debug')}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}>
          <ProgressRing fraction={progress.ring} trackColor={theme.border} fillColor={theme.accent}>
            <View style={styles.ringCenter}>
              <SymbolView
                name="flame.fill"
                tintColor={progress.met ? theme.accent : theme.textSecondary}
                size={11}
              />
              <Text style={[styles.ringStreak, { color: theme.text }]}>{streak}</Text>
            </View>
          </ProgressRing>
        </Pressable>
      </View>

      {/* One pill per target, so an outstanding rep goal is never invisible —
          with all parts required, a hidden target is a streak that breaks
          without warning. */}
      {parts.length > 0 && (
        <View style={styles.pillRow}>
          {parts.map((part) => (
            <TargetPill key={part.exerciseId} part={part} onPress={() => setGoalSheetOpen(true)} />
          ))}
        </View>
      )}

      <Modal
        visible={goalSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGoalSheetOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetStop}>
            <Pressable onPress={() => Keyboard.dismiss()}>
              <ThemedView type="backgroundElement" bordered style={styles.sheet}>
                <ThemedText type="subtitle">Daily goal</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Minutes of stretching per day
                </ThemedText>
                <ThemedText type="small" themeColor={progress.timeMet ? undefined : 'textSecondary'}>
                  {mmss(progress.seconds)} of {mmss(progress.goalSeconds)} today
                  {progress.timeMet
                    ? ' ✓'
                    : ` — ${mmss(progress.goalSeconds - progress.seconds)} to go`}
                </ThemedText>
                <View style={styles.goalGrid}>
                  {GOAL_PRESETS.map((min) => (
                    <GoalChip
                      key={min}
                      label={String(min)}
                      active={Math.round(tracking.goalSeconds / 60) === min}
                      onPress={() => {
                        setGoalMinutes(min);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  ))}
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <ThemedText type="small" themeColor="textSecondary">
                  Reps per day — leave blank for no target. With one set, the day only counts once
                  it’s hit as well.
                </ThemedText>
                {EXERCISES.map((exercise) => (
                  <TargetRow
                    key={exercise.id}
                    exercise={exercise}
                    target={tracking.repTargets[exercise.id] ?? 0}
                    part={progress.parts.find((p) => p.exerciseId === exercise.id)}
                  />
                ))}

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setGoalSheetOpen(false);
                  }}
                  style={({ pressed }) => [styles.doneWrap, pressed && styles.pressed]}>
                  <View style={[styles.done, { backgroundColor: theme.accent }]}>
                    <Text style={[styles.doneText, { color: theme.accentForeground }]}>Done</Text>
                  </View>
                </Pressable>
              </ThemedView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * A target's standing as a header pill: "Push-ups 12/20", accent once hit.
 * Named in words rather than an icon — the SF Symbols for these movements are
 * too alike at this size to tell push-ups from pull-ups at a glance.
 */
function TargetPill({ part, onPress }: { part: PartProgress; onPress: () => void }) {
  const theme = useTheme();
  const exercise = getExercise(part.exerciseId);
  const color = part.met ? theme.accent : theme.text;

  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.pill, { borderColor: part.met ? theme.accent : theme.border }]}>
        <Text style={[styles.pillLabel, { color: theme.textSecondary }]}>
          {exercise?.name ?? part.exerciseId}
        </Text>
        <Text style={[styles.pillText, { color }]}>
          {part.reps}/{part.target}
          {part.met ? ' ✓' : ''}
        </Text>
      </ThemedView>
    </Pressable>
  );
}

/**
 * One exercise's daily rep target: a plain number field, since the useful
 * numbers are personal and change as you get stronger — presets can't cover
 * them. Empty (or 0) means no target for that exercise.
 */
function TargetRow({
  exercise,
  target,
  part,
}: {
  exercise: Exercise;
  target: number;
  part: PartProgress | undefined;
}) {
  const theme = useTheme();
  // `draft` holds what's being typed (including empty) so the field doesn't
  // fight the store mid-edit; outside an edit the store is the truth.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (target > 0 ? String(target) : '');

  return (
    <View style={styles.targetRow}>
      <View style={styles.targetLabel}>
        <ThemedText type="small">{exercise.name}</ThemedText>
        <ThemedText type="small" themeColor={part?.met ? undefined : 'textSecondary'}>
          {part ? `${part.reps} of ${part.target} today${part.met ? ' ✓' : ''}` : 'no target'}
        </ThemedText>
      </View>
      <TextInput
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
          setDraft(digits);
          setExerciseTarget(exercise.id, digits === '' ? 0 : Number(digits));
        }}
        onBlur={() => setDraft(null)}
        keyboardType="number-pad"
        placeholder="Off"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        style={[
          styles.targetInput,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
        ]}
      />
    </View>
  );
}

function GoalChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.goalChip,
          active
            ? { backgroundColor: theme.accent, borderColor: theme.accent }
            : { borderColor: theme.border },
        ]}>
        <Text
          style={[styles.goalChipText, { color: active ? theme.accentForeground : theme.text }]}>
          {label}
        </Text>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Wraps, so a narrow phone with three targets stacks instead of clipping.
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: BorderWidth,
    borderRadius: Radius.full,
  },
  pillLabel: { fontSize: 11, lineHeight: 14 },
  pillText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 14 },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringStreak: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 16 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetStop: { padding: Spacing.three, paddingBottom: Spacing.six },
  sheet: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  divider: { height: BorderWidth, marginVertical: Spacing.two },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  targetLabel: { flex: 1, gap: Spacing.half },
  targetInput: {
    width: 80,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: BorderWidth,
    borderRadius: Radius.md,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  doneWrap: { marginTop: Spacing.four },
  done: { borderRadius: Radius.md, paddingVertical: Spacing.three, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '600' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  goalChip: {
    minWidth: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: BorderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
