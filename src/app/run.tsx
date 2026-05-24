import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stretchImages } from '@/stretches/images';
import { buildRoutineSegments } from '@/routines/routines';
import { resolveItems } from '@/routines/resolve';
import { getQuickItems } from '@/routines/quickRoutine';
import { getRoutine } from '@/routines/store';
import { stretches } from '@/stretches/library';
import { buildSegments, withLeadIn } from '@/stretches/segments';
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
  const { id, option, routine: routineId, quick } = useLocalSearchParams<{
    id?: string;
    option?: string;
    routine?: string;
    quick?: string;
  }>();

  // Resolve a single stretch+option, a saved routine, or the queue into one plan.
  const plan = useMemo(() => {
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
    });
    return { title: stretch.name, segments, fallbackImage: stretch.image };
  }, [id, option, routineId, quick]);

  // useTimer must run unconditionally; feed a harmless placeholder when invalid.
  const segments = plan?.segments ?? [{ label: '—', seconds: 1 }];

  const timer = useTimer(segments, {
    onEvent: (event) => {
      if (event.type === 'segment-advance') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Speech.speak('Done');
      }
    },
  });

  // Announce the current segment whenever it changes (covers the first one too).
  useEffect(() => {
    if (!plan) return;
    Speech.stop();
    Speech.speak(timer.currentSegment.label);
  }, [plan, timer.currentSegment.label]);

  // Stop any speech when leaving the screen.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

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
  const isPrep = label === 'Get ready' || label.startsWith('Next:');
  const done = timer.status === 'completed';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
          <SymbolView name="xmark" tintColor={theme.textSecondary} size={22} />
        </Pressable>

        {photo && <Image source={photo} style={styles.photo} contentFit="cover" />}

        <ThemedText type="small" themeColor="textSecondary">
          {plan.title} · {timer.segmentIndex + 1}/{segments.length}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.segLabel}>
          {done ? 'Done' : label}
        </ThemedText>
        <ThemedText
          style={[
            styles.clock,
            { color: done ? theme.text : isPrep ? theme.textSecondary : theme.accent },
          ]}>
          {clock(timer.remaining)}
        </ThemedText>

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
            <ControlButton
              icon={timer.status === 'paused' ? 'play.fill' : 'pause.fill'}
              label={timer.status === 'paused' ? 'Resume' : 'Pause'}
              onPress={timer.status === 'paused' ? timer.resume : timer.pause}
              primary
            />
            <ControlButton icon="forward.fill" label="Skip" onPress={timer.skip} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.controlButton}>
        <ThemedView
          type="backgroundElement"
          bordered={!primary}
          style={[styles.controlCircle, primary && { backgroundColor: theme.accent }]}>
          <SymbolView name={icon} tintColor={primary ? theme.accentForeground : theme.text} size={28} />
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  close: { position: 'absolute', top: Spacing.five, right: Spacing.four, zIndex: 1 },
  photo: { width: '100%', aspectRatio: 850 / 567, borderRadius: Radius.lg },
  segLabel: { textAlign: 'center' },
  clock: { fontSize: 80, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 88, letterSpacing: -1 },
  controls: { flexDirection: 'row', gap: Spacing.six },
  controlButton: { alignItems: 'center', gap: Spacing.one },
  controlCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
