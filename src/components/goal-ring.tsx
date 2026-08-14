import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, todayProgress } from '@/tracking/streaks';
import { setGoalMinutes, useTracking } from '@/tracking/store';
import { useTodayLocalDate } from '@/tracking/today';

const GOAL_PRESETS = [5, 10, 15, 20, 30, 45, 60];

/**
 * The daily-goal progress ring (flame + streak count inside). Tapping it opens
 * the goal sheet. Self-contained so any tab header can show it.
 */
export function GoalRing() {
  const theme = useTheme();
  const router = useRouter();
  const tracking = useTracking();
  const today = useTodayLocalDate();
  const progress = todayProgress(tracking.log, today, tracking.goalSeconds);
  const streak = currentStreak(tracking.log, today);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setGoalSheetOpen(true)}
        onLongPress={() => router.push('/debug')}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}>
        <ProgressRing fraction={progress.fraction} trackColor={theme.border} fillColor={theme.accent}>
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

      <Modal
        visible={goalSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGoalSheetOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheetStop}>
            <ThemedView type="backgroundElement" bordered style={styles.sheet}>
              <ThemedText type="subtitle">Daily goal</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Minutes of stretching per day
              </ThemedText>
              <View style={styles.goalGrid}>
                {GOAL_PRESETS.map((min) => {
                  const active = Math.round(tracking.goalSeconds / 60) === min;
                  return (
                    <Pressable
                      key={min}
                      onPress={() => {
                        setGoalMinutes(min);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGoalSheetOpen(false);
                      }}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView
                        type="backgroundElement"
                        style={[
                          styles.goalChip,
                          active
                            ? { backgroundColor: theme.accent, borderColor: theme.accent }
                            : { borderColor: theme.border },
                        ]}>
                        <Text
                          style={[
                            styles.goalChipText,
                            { color: active ? theme.accentForeground : theme.text },
                          ]}>
                          {min}
                        </Text>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringStreak: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 16 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetStop: { padding: Spacing.three, paddingBottom: Spacing.six },
  sheet: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
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
