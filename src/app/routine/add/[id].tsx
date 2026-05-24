import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addItem } from '@/routines/routines';
import { updateRoutine } from '@/routines/store';
import { stretchImages } from '@/stretches/images';
import { stretches } from '@/stretches/library';
import { formatDuration, optionDuration } from '@/stretches/segments';

export default function AddStretchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stretches;
    return stretches.filter(
      (s) => s.name.toLowerCase().includes(q) || s.muscles.some((m) => m.toLowerCase().includes(q))
    );
  }, [query]);

  const add = (stretchId: string, optionIndex: number) => {
    updateRoutine(id, (r) => addItem(r, { stretchId, optionIndex }));
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add stretch' }} />
      <TextInput
        placeholder="Search name or muscle…"
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        style={[
          styles.search,
          { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
        ]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const photo = stretchImages[item.image]?.[0];
          const open = expanded === item.id;
          return (
            <ThemedView type="backgroundElement" bordered style={styles.card}>
              <Pressable
                onPress={() => setExpanded(open ? null : item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                {photo && <Image source={photo} style={styles.thumb} contentFit="cover" />}
                <ThemedText style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
              </Pressable>
              {open && (
                <View style={styles.options}>
                  {item.options.map((option, index) => (
                    <Pressable
                      key={index}
                      onPress={() => add(item.id, index)}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView type="backgroundElement" bordered style={styles.optionChip}>
                        <ThemedText type="small">
                          {formatDuration(optionDuration(option))}
                          {option.kind === 'perSide' ? ' · per side' : ''}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </View>
              )}
            </ThemedView>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: BorderWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  listContent: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  thumb: { width: 56, height: 56, borderRadius: Radius.md },
  rowName: { flex: 1 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  optionChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
  pressed: { opacity: 0.6 },
});
