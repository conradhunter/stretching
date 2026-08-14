import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiagEvents } from '@/tracking/diagStore';
import { lastNDays, metDayCount } from '@/tracking/forensics';
import { currentStreak, type StreakLog } from '@/tracking/streaks';
import { BACKUP_KEY, TRACKING_KEY, useTracking, type Tracking } from '@/tracking/store';
import { useTodayLocalDate } from '@/tracking/today';

const SHOWN_DAYS = 14;

type DiskRead =
  | { status: 'loading' }
  | { status: 'null' }
  | { status: 'error'; message: string }
  | { status: 'ok'; raw: string; data: Tracking };

function readKey(key: string): Promise<DiskRead> {
  return AsyncStorage.getItem(key)
    .then((raw): DiskRead => {
      if (raw == null) return { status: 'null' };
      const parsed = JSON.parse(raw) as Partial<Tracking>;
      return {
        status: 'ok',
        raw,
        data: { log: parsed.log ?? {}, goalSeconds: parsed.goalSeconds ?? 0 },
      };
    })
    .catch((e): DiskRead => ({ status: 'error', message: String(e) }));
}

function summarize(log: StreakLog): string {
  const dates = Object.keys(log).sort();
  return `${dates.length} days, ${metDayCount(log)} met, ${dates[0] ?? '—'} … ${dates[dates.length - 1] ?? '—'}`;
}

/**
 * Hidden forensics inspector (long-press the goal ring). Shows the streak log
 * as the app sees it in memory, what is ACTUALLY persisted on disk right now,
 * the grow-only backup, and the diagnostic breadcrumb trail — enough to tell a
 * real wipe from a single lost day from a display bug.
 */
export default function DebugScreen() {
  const theme = useTheme();
  const tracking = useTracking();
  const today = useTodayLocalDate();
  const events = useDiagEvents();
  const [disk, setDisk] = useState<DiskRead>({ status: 'loading' });
  const [backup, setBackup] = useState<DiskRead>({ status: 'loading' });

  const refresh = useCallback(() => {
    readKey(TRACKING_KEY).then(setDisk);
    readKey(BACKUP_KEY).then(setBackup);
  }, []);
  useEffect(refresh, [refresh]);

  const memoryJson = JSON.stringify(tracking.log);
  const diskJson = disk.status === 'ok' ? JSON.stringify(disk.data.log) : null;
  const diverged = diskJson != null && diskJson !== memoryJson;

  const share = () => {
    Share.share({
      message: JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          today,
          memory: tracking,
          disk: disk.status === 'ok' ? disk.data : disk.status,
          backup: backup.status === 'ok' ? backup.data : backup.status,
          events,
        },
        null,
        2
      ),
    });
  };

  const dayRows = (log: StreakLog) =>
    lastNDays(today, SHOWN_DAYS).map((date) => {
      const day = log[date];
      const met = day != null && day.seconds >= day.goalSeconds;
      return (
        <View key={date} style={styles.row}>
          <ThemedText type="small" style={styles.mono}>
            {date}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.mono, { color: day == null ? theme.textSecondary : met ? theme.accent : theme.text }]}>
            {day == null ? '—' : `${day.seconds}/${day.goalSeconds}s${met ? ' ✓' : ''}`}
          </ThemedText>
        </View>
      );
    });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView bordered style={styles.card}>
        <ThemedText type="subtitle">Computed</ThemedText>
        <ThemedText type="small" style={styles.mono}>
          today {today} · streak {currentStreak(tracking.log, today)} · goal {tracking.goalSeconds}s
        </ThemedText>
      </ThemedView>

      <ThemedView bordered style={styles.card}>
        <ThemedText type="subtitle">In memory</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.mono}>
          {summarize(tracking.log)}
        </ThemedText>
        {dayRows(tracking.log)}
      </ThemedView>

      <ThemedView bordered style={styles.card}>
        <ThemedText type="subtitle">On disk (live re-read)</ThemedText>
        {disk.status === 'ok' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.mono}>
              {disk.raw.length}B · {summarize(disk.data.log)}
            </ThemedText>
            {diverged && (
              <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
                ⚠ DISK ≠ MEMORY — writes are not landing
              </ThemedText>
            )}
            {dayRows(disk.data.log)}
          </>
        ) : (
          <ThemedText type="small" style={styles.mono}>
            {disk.status === 'error' ? `read error: ${disk.message}` : disk.status}
          </ThemedText>
        )}
        <Pressable onPress={refresh}>
          <ThemedText type="linkPrimary">Re-read disk</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView bordered style={styles.card}>
        <ThemedText type="subtitle">Backup (grow-only)</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.mono}>
          {backup.status === 'ok'
            ? summarize(backup.data.log)
            : backup.status === 'error'
              ? `read error: ${backup.message}`
              : 'none yet'}
        </ThemedText>
      </ThemedView>

      <ThemedView bordered style={styles.card}>
        <ThemedText type="subtitle">Trail ({events.length})</ThemedText>
        {[...events].reverse().map((e, i) => (
          <ThemedText key={i} type="small" style={styles.mono}>
            {e.at.slice(5, 19)} {e.type} {e.detail}
          </ThemedText>
        ))}
      </ThemedView>

      <Pressable onPress={share} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.shareButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="default" style={{ color: theme.accentForeground, fontWeight: '600' }}>
            Share full dump
          </ThemedText>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.three },
  card: { borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.one },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontVariant: ['tabular-nums'] },
  shareButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
