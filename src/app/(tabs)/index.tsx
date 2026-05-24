import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { stretchImages } from '@/stretches/images';
import { stretches } from '@/stretches/library';
import { MUSCLE_GROUPS, filterStretches } from '@/stretches/muscles';
import type { Stretch } from '@/stretches/segments';

export default function StretchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const filtered = useMemo(
    () => filterStretches(stretches, query, selectedGroups),
    [query, selectedGroups]
  );

  const toggleGroup = (name: string) =>
    setSelectedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.pillsScroll}
          contentContainerStyle={styles.pills}>
          {MUSCLE_GROUPS.map((group) => {
            const active = selectedGroups.includes(group.name);
            return (
              <Pressable key={group.name} onPress={() => toggleGroup(group.name)}>
                <ThemedView
                  type={active ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.pill, { borderColor: active ? theme.text : 'transparent' }]}>
                  <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                    {group.name}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ScrollView>
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
  pillsScroll: { flexGrow: 0, marginBottom: Spacing.two },
  pills: { gap: Spacing.two, paddingRight: Spacing.three },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
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
