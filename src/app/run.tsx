import { Image } from 'expo-image';
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
import { useTheme } from '@/hooks/use-theme';
import { stretchImages } from '@/stretches/images';
import { buildRoutineSegments } from '@/routines/routines';
import { resolveItems } from '@/routines/resolve';
import { getQuickItems } from '@/routines/quickRoutine';
import { getRoutine } from '@/routines/store';
import { useAllStretches } from '@/stretches/customStore';
import {
  buildQuickPerSideSegments,
  buildQuickSegments,
  buildSegments,
  withLeadIn,
} from '@/stretches/segments';
import { recordStretchSeconds } from '@/tracking/store';
import { useTimer } from '@/timer/useTimer';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RunScreen() {
  useKeepAwake();
  const theme = useTheme();
  const router = useRouter();
  // fullScreenModal: the SafeAreaView component reads 0 top inset here, so pull
  // the raw insets and pad the chrome ourselves (close button clears the clock).
  const insets = useSafeAreaInsets();
  const { id, option, routine: routineId, quick, seconds, perSide } = useLocalSearchParams<{
    id?: string;
    option?: string;
    routine?: string;
    quick?: string;
    seconds?: string;
    perSide?: string;
  }>();
  const isQuick = seconds !== undefined || perSide !== undefined;
  // Subscribed (not a snapshot) so plans re-resolve once persisted customs load.
  const stretches = useAllStretches();

  // Resolve a single stretch+option, a saved routine, the queue, or a bare
  // duration ("Quick") into one plan.
  const plan = useMemo(() => {
    if (perSide !== undefined) {
      const n = Number(perSide);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { title: 'Quick', segments: buildQuickPerSideSegments(n), fallbackImage: undefined };
    }

    if (seconds !== undefined) {
      const n = Number(seconds);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { title: 'Quick', segments: buildQuickSegments(n), fallbackImage: undefined };
    }

    if (quick) {
      const items = resolveItems(getQuickItems());
      if (items.length === 0) return null;
      return { title: 'Queue', segments: buildRoutineSegments(items), fallbackImage: undefined };
    }

    if (routineId) {
      const routine = getRoutine(routineId);
      if (!routine) return null;
      const items = resolveItems(routine.items);
      if (items.length === 0) return null;
      return { title: routine.name, segments: buildRoutineSegments(items), fallbackImage: undefined };
    }

    const stretch = stretches.find((s) => s.id === id);
    const chosen = stretch?.options[Number(option)];
    if (!stretch || !chosen) return null;
    const segments = withLeadIn(buildSegments(stretch, chosen), {
      label: 'Get ready',
      seconds: 3,
      image: stretch.image,
      prep: true,
    });
    return { title: stretch.name, segments, fallbackImage: stretch.image };
  }, [id, option, routineId, quick, seconds, perSide, stretches]);

  // useTimer must run unconditionally; feed a harmless placeholder when invalid.
  const segments = plan?.segments ?? [{ label: '—', seconds: 1, prep: true }];

  const timer = useTimer(segments, {
    onEvent: (event) => {
      playChime();
      if (event.type === 'segment-advance') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  // Per-second chime in the last 5 seconds of each work segment — heads-up
  // before the boundary so you can prep to release/switch.
  useEffect(() => {
    if (timer.status !== 'running') return;
    if (timer.currentSegment.prep) return;
    if (timer.remaining < 1 || timer.remaining > 5) return;
    playChime();
  }, [timer.remaining, timer.status, timer.currentSegment.prep]);

  // Credit stretched time toward the daily goal as deltas at every segment
  // boundary / pause / completion — NOT only on unmount. Unmount cleanups never
  // run when the app is force-quit, and crediting only at exit meant a
  // swipe-kill right after finishing silently lost the whole session (the
  // "streak reset to 0 overnight" bug). The unmount credit stays as a catch-all
  // for bailing out mid-segment.
  const elapsedRef = useRef(0);
  elapsedRef.current = timer.elapsedStretchSeconds;
  const creditedRef = useRef(0);
  const credit = () => {
    const delta = elapsedRef.current - creditedRef.current;
    if (delta <= 0) return;
    creditedRef.current = elapsedRef.current;
    recordStretchSeconds(delta);
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

  const label = timer.currentSegment.label;
  const imageKey = timer.currentSegment.image ?? plan.fallbackImage;
  const photo = imageKey ? stretchImages[imageKey]?.[0] : undefined;
  const isPrep = timer.currentSegment.prep === true;
  const done = timer.status === 'completed';
  const paused = timer.status === 'paused';

  // Position within the routine counts work segments only — the "Get ready" /
  // "Next: …" prep beats don't get their own number (matches Bend's "1 of 8").
  const workTotal = segments.filter((s) => !s.prep).length;
  const workBefore = segments.slice(0, timer.segmentIndex).filter((s) => !s.prep).length;
  const position = Math.min(workBefore + 1, workTotal);

  // Current hold's progress, 0..1, filling as it elapses — drives the bar over the photo.
  const segSeconds = timer.currentSegment.seconds;
  const progress = done ? 1 : segSeconds > 0 ? (segSeconds - timer.remaining) / segSeconds : 0;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBarSide}>
            <SymbolView name="xmark" tintColor={theme.textSecondary} size={22} />
          </Pressable>
          {isQuick ? (
            <View />
          ) : (
            <ThemedText type="default" style={styles.position}>
              {position} of {workTotal}
            </ThemedText>
          )}
          <View style={styles.topBarSide} />
        </View>

        <View style={styles.content}>
          {!isQuick && (
            <View style={styles.photoBlock}>
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.textSecondary, width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              {photo ? (
                <Image source={photo} style={styles.photo} contentFit="cover" />
              ) : (
                <View
                  style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                  <SymbolView name="figure.flexibility" tintColor={theme.textSecondary} size={72} />
                </View>
              )}
            </View>
          )}

          {/* Quick runs have no stretch name, but still surface the prep beats
              ("Get ready" / "Switch sides") so the buffer reads as intentional. */}
          {(!isQuick || (isPrep && !done)) && (
            <ThemedText type="subtitle" style={styles.segLabel}>
              {done ? 'Done' : label}
            </ThemedText>
          )}
          <ThemedText style={[styles.clock, { color: isPrep && !done ? theme.textSecondary : theme.text }]}>
            {clock(timer.remaining)}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          {done ? (
            <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.doneButton, { backgroundColor: theme.accent }]}>
                <ThemedText type="default" style={{ color: theme.accentForeground, fontWeight: '600' }}>
                  Finish
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <View style={styles.controls}>
              {!isQuick && <ControlButton icon="backward.fill" onPress={timer.previous} />}
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
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  photoBlock: { width: '100%', alignItems: 'center', gap: Spacing.three },
  track: { width: '100%', height: 4, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  photo: { width: '100%', aspectRatio: 850 / 567, borderRadius: Radius.lg },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  segLabel: { textAlign: 'center' },
  clock: { fontSize: 80, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 88, letterSpacing: -1 },
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
