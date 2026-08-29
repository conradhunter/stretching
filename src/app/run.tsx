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
import { buildQuickPerSideSegments, buildQuickSegments } from '@/timer/quick';
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
  const { seconds, perSide } = useLocalSearchParams<{ seconds?: string; perSide?: string }>();

  // A bare duration ("Quick"), held once or once per side.
  const segments = useMemo(() => {
    if (perSide !== undefined) {
      const n = Number(perSide);
      if (!Number.isFinite(n) || n <= 0) return null;
      return buildQuickPerSideSegments(n);
    }

    if (seconds !== undefined) {
      const n = Number(seconds);
      if (!Number.isFinite(n) || n <= 0) return null;
      return buildQuickSegments(n);
    }

    return null;
  }, [seconds, perSide]);

  // useTimer must run unconditionally; feed a harmless placeholder when invalid.
  const timer = useTimer(segments ?? [{ label: '—', seconds: 1, prep: true }], {
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

  if (!segments) {
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
  const done = timer.status === 'completed';
  const paused = timer.status === 'paused';

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
          <View />
          <View style={styles.topBarSide} />
        </View>

        <View style={styles.content}>
          {/* Quick runs have no stretch name, but still surface the prep beats
              ("Get ready" / "Switch sides") so the buffer reads as intentional. */}
          {(isPrep || done) && (
            <ThemedText type="subtitle" style={styles.segLabel}>
              {done ? 'Done' : timer.currentSegment.label}
            </ThemedText>
          )}
          <ThemedText
            style={[styles.clock, { color: isPrep && !done ? theme.textSecondary : theme.text }]}>
            {clock(timer.remaining)}
          </ThemedText>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  segLabel: { textAlign: 'center' },
  clock: {
    fontSize: 80,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 88,
    letterSpacing: -1,
  },
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
