import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stretchImages } from '@/stretches/images';
import { stretches } from '@/stretches/library';
import type { Stretch } from '@/stretches/segments';

export default function StretchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stretches;
    return stretches.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.muscles.some((m) => m.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.heading}>
          Stretches
        </ThemedText>
        <TextInput
          placeholder="Search name or muscle…"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          style={[
            styles.search,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <StretchRow
              stretch={item}
              onPress={() => router.push({ pathname: '/stretch/[id]', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No stretches match “{query}”.
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function StretchRow({ stretch, onPress }: { stretch: Stretch; onPress: () => void }) {
  const theme = useTheme();
  const photo = stretchImages[stretch.image]?.[0];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {photo ? (
          <Image source={photo} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={1}>
            {stretch.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {stretch.muscles.join(', ') || 'stretch'}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  heading: { paddingTop: Spacing.two, paddingBottom: Spacing.two },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  thumb: { width: 64, height: 64, borderRadius: Spacing.two },
  rowText: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.6 },
  empty: { textAlign: 'center', paddingTop: Spacing.five },
});
