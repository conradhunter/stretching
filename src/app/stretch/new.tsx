import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addCustomStretch,
  deleteCustomStretch,
  updateCustomStretch,
  useAllStretches,
  useCustomStretches,
} from '@/stretches/customStore';
import { allMuscles, muscleLabel } from '@/stretches/muscles';

const DURATIONS = [15, 20, 30, 45, 60];

export default function NewStretchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { name: prefill, edit } = useLocalSearchParams<{ name?: string; edit?: string }>();

  const all = useAllStretches();
  const editing = useCustomStretches().find((s) => s.id === edit);

  const [name, setName] = useState(editing?.name ?? prefill ?? '');
  const [perSide, setPerSide] = useState(editing ? editing.options[0]?.kind === 'perSide' : false);
  const [seconds, setSeconds] = useState<number[]>(() =>
    editing
      ? editing.options.map((o) => (o.kind === 'hold' ? o.seconds : o.secondsPerSide))
      : [30]
  );
  const [muscles, setMuscles] = useState<string[]>(editing?.muscles ?? []);

  const canSave = name.trim().length > 0 && seconds.length > 0;

  const save = () => {
    const input = { name, perSide, seconds, muscles };
    if (editing) updateCustomStretch(editing.id, input);
    else addCustomStretch(input);
    router.back();
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('Delete stretch?', `“${editing.name}” will be removed from any routines.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCustomStretch(editing.id);
          router.dismissAll();
        },
      },
    ]);
  };

  const toggleSeconds = (s: number) =>
    setSeconds((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]));
  const toggleMuscle = (m: string) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m]));

  const pill = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.pill,
          active
            ? { backgroundColor: theme.accent, borderColor: theme.accent }
            : { borderColor: theme.border },
        ]}>
        <Text style={[styles.pillText, { color: active ? theme.accentForeground : theme.textSecondary }]}>
          {label}
        </Text>
      </ThemedView>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Stretch' : 'New Stretch',
          headerRight: () => (
            <Pressable onPress={save} disabled={!canSave} hitSlop={10}>
              <ThemedText
                type="default"
                style={{ fontWeight: '600', color: canSave ? theme.accent : theme.textSecondary }}>
                Save
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          placeholder="Stretch name"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
          autoFocus={!editing}
          autoCorrect={false}
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
          ]}
        />

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          TYPE
        </ThemedText>
        <View style={styles.pills}>
          {pill('One hold', !perSide, () => setPerSide(false))}
          {pill('Both sides', perSide, () => setPerSide(true))}
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          {perSide ? 'DURATION — PER SIDE' : 'DURATION'}
        </ThemedText>
        <View style={styles.pills}>
          {DURATIONS.map((s) => pill(`${s}s`, seconds.includes(s), () => toggleSeconds(s)))}
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          MUSCLES
        </ThemedText>
        <View style={[styles.pills, styles.wrap]}>
          {allMuscles(all).map((m) => pill(muscleLabel(m), muscles.includes(m), () => toggleMuscle(m)))}
        </View>

        {editing && (
          <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <ThemedText type="default" style={{ fontWeight: '600', color: theme.destructive }}>
              Delete stretch
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  input: {
    borderRadius: Radius.md,
    borderWidth: BorderWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  label: { letterSpacing: 1, marginTop: Spacing.two, textTransform: 'uppercase' },
  pills: { flexDirection: 'row', gap: Spacing.two },
  wrap: { flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: BorderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  delete: { marginTop: Spacing.five, alignItems: 'center' },
  pressed: { opacity: 0.6 },
});
