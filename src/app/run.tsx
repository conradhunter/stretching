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
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stretchImages } from '@/stretches/images';
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
  const { id, option } = useLocalSearchParams<{ id: string; option: string }>();

  const stretch = stretches.find((s) => s.id === id);
  const chosen = stretch?.options[Number(option)];

  const segments = useMemo(() => {
    if (!stretch || !chosen) return [];
    return withLeadIn(buildSegments(stretch, chosen), { label: 'Get ready', seconds: 3 });
  }, [stretch, chosen]);

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
    if (segments.length === 0) return;
    Speech.stop();
    Speech.speak(timer.currentSegment.label);
  }, [timer.currentSegment.label, segments.length]);

  // Stop any speech when leaving the screen.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!stretch || !chosen) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Couldn’t start this stretch.</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="linkPrimary">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const photo = stretchImages[stretch.image]?.[0];
  const isLeadIn = timer.segmentIndex === 0;
  const done = timer.status === 'completed';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
          <SymbolView name="xmark" tintColor={theme.textSecondary} size={22} />
        </Pressable>

        {photo && <Image source={photo} style={styles.photo} contentFit="cover" />}

        <ThemedText type="small" themeColor="textSecondary">
          {stretch.name} · {timer.segmentIndex + 1}/{segments.length}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.segLabel}>
          {done ? 'Done' : timer.currentSegment.label}
        </ThemedText>
        <ThemedText style={[styles.clock, isLeadIn && !done && { color: theme.textSecondary }]}>
          {clock(timer.remaining)}
        </ThemedText>

        {done ? (
          <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.doneButton}>
              <ThemedText type="default">Finish</ThemedText>
            </ThemedView>
          </Pressable>
        ) : (
          <View style={styles.controls}>
            <ControlButton
              icon={timer.status === 'paused' ? 'play.fill' : 'pause.fill'}
              label={timer.status === 'paused' ? 'Resume' : 'Pause'}
              onPress={timer.status === 'paused' ? timer.resume : timer.pause}
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
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.controlButton}>
        <ThemedView type="backgroundElement" style={styles.controlCircle}>
          <SymbolView name={icon} tintColor={theme.text} size={28} />
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
  photo: { width: '100%', aspectRatio: 850 / 567, borderRadius: Spacing.four },
  segLabel: { textAlign: 'center' },
  clock: { fontSize: 80, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 88 },
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
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
