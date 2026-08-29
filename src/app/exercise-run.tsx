import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { playChime } from '@/audio/chime';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import {
  buildRepSegments,
  currentRep,
  getExercise,
  repsCompletedAt,
} from '@/exercises/exercises';
import { recordExerciseReps } from '@/exercises/store';
import { useTheme } from '@/hooks/use-theme';
import { useTimer } from '@/timer/useTimer';

export default function ExerciseRunScreen() {
  useKeepAwake();
  const theme = useTheme();
  const router = useRouter();
  // fullScreenModal: SafeAreaView reads a 0 top inset here, so pad the chrome
  // from the raw insets instead.
  const insets = useSafeAreaInsets();
  const { id, reps } = useLocalSearchParams<{ id?: string; reps?: string }>();

  const plan = useMemo(() => {
    const exercise = id ? getExercise(id) : undefined;
    const count = Number(reps);
    if (!exercise || !Number.isFinite(count) || count <= 0) return null;
    return { exercise, reps: count, segments: buildRepSegments(exercise, count) };
  }, [id, reps]);

  // useTimer must run unconditionally; feed a harmless placeholder when invalid.
  const segments = plan?.segments ?? [{ label: '—', seconds: 1, prep: true }];

  const timer = useTimer(segments, {
    onEvent: (event) => {
      if (event.type === 'segment-advance') {
        // One beat per phase flip — the cue you feel, since the phone is on the
        // floor and you're not always looking at it.
        Haptics.impactAsync(
          event.segment.prep
            ? Haptics.ImpactFeedbackStyle.Light
            : Haptics.ImpactFeedbackStyle.Medium
        );
      } else {
        playChime();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const done = timer.status === 'completed';
  const paused = timer.status === 'paused';
  const repsDone = plan
    ? done
      ? plan.reps
      : Math.min(plan.reps, repsCompletedAt(timer.segmentIndex))
    : 0;

  // Credit finished reps as deltas at every phase boundary — NOT only on
  // unmount, which never runs on a force-quit (the lesson from the stretching
  // streak losses). Bailing out mid-set keeps every rep already completed.
  const exerciseIdRef = useRef<string | undefined>(plan?.exercise.id);
  exerciseIdRef.current = plan?.exercise.id;
  const repsDoneRef = useRef(0);
  repsDoneRef.current = repsDone;
  const creditedRef = useRef(0);
  const credit = () => {
    const exerciseId = exerciseIdRef.current;
    const delta = repsDoneRef.current - creditedRef.current;
    if (!exerciseId || delta <= 0) return;
    creditedRef.current = repsDoneRef.current;
    void recordExerciseReps(exerciseId, delta);
  };
  useEffect(credit, [timer.segmentIndex, timer.status]);
  useEffect(() => credit, []);

  if (!plan) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Couldn’t start this.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const isPrep = timer.currentSegment.prep === true;
  const rep = currentRep(timer.segmentIndex, plan.reps);
  const name = plan.exercise.name.toLowerCase();

  // Fill of the current phase (0..1) — the bar that paces the rep.
  const segSeconds = timer.currentSegment.seconds;
  const phaseProgress = done ? 1 : segSeconds > 0 ? (segSeconds - timer.remaining) / segSeconds : 0;
  const setProgress = done ? 1 : repsDone / plan.reps;

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.safeArea,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom },
        ]}>
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBarSide}>
            <SymbolView name="xmark" tintColor={theme.textSecondary} size={22} />
          </Pressable>
          <ThemedText type="default" style={styles.position}>
            {done ? `${plan.reps} of ${plan.reps}` : `Rep ${rep} of ${plan.reps}`}
          </ThemedText>
          <View style={styles.topBarSide} />
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            {plan.exercise.name}
          </ThemedText>

          {/* The whole point of the screen: one word, readable from the floor. */}
          <ThemedText
            style={[styles.phase, { color: isPrep && !done ? theme.textSecondary : theme.text }]}>
            {done ? 'Done' : isPrep ? 'Get ready' : timer.currentSegment.label}
          </ThemedText>

          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: isPrep && !done ? theme.textSecondary : theme.accent,
                  width: `${Math.round(phaseProgress * 100)}%`,
                },
              ]}
            />
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {done ? `${plan.reps} ${name} logged` : `${repsDone} of ${plan.reps} done`}
          </ThemedText>

          <View style={[styles.setTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.textSecondary, width: `${Math.round(setProgress * 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.footer}>
          {done ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.doneButton, { backgroundColor: theme.accent }]}>
                <ThemedText
                  type="default"
                  style={{ color: theme.accentForeground, fontWeight: '600' }}>
                  Finish
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <View style={styles.controls}>
              <ControlButton
                icon={paused ? 'play.fill' : 'pause.fill'}
                onPress={paused ? timer.resume : timer.pause}
                size={76}
              />
              <ControlButton icon="forward.fill" onPress={timer.skip} />
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

function ControlButton({
  icon,
  onPress,
  size = 60,
}: {
  icon: SymbolViewProps['name'];
  onPress: () => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        bordered
        style={[
          styles.controlCircle,
          styles.float,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <SymbolView name={icon} tintColor={theme.text} size={size * 0.4} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: BorderWidth,
  },
  topBarSide: { width: 40 },
  position: { fontWeight: '600' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  phase: {
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
  },
  track: { width: '100%', height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  setTrack: { width: '60%', height: 4, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  footer: { paddingBottom: Spacing.four, alignItems: 'center' },
  controls: { flexDirection: 'row', gap: Spacing.five, alignItems: 'center' },
  controlCircle: { alignItems: 'center', justifyContent: 'center' },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  doneButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
