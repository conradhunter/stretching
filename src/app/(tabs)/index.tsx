import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Rect } from '@/components/lightbox/geometry';
import { ImageLightbox } from '@/components/lightbox/image-lightbox';
import { measureFrame } from '@/components/lightbox/measure';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addToQuick, useQuickRoutine } from '@/routines/quickRoutine';
import { stretchImages } from '@/stretches/images';
import { stretches } from '@/stretches/library';
import { bumpMuscle, useMuscleCounts } from '@/stretches/muscleUsage';
import {
  allMuscles,
  expandMuscleSelection,
  filterStretches,
  isMuscleGroup,
  MUSCLE_GROUPS,
  muscleLabel,
  orderByUsage,
} from '@/stretches/muscles';
import type { Stretch } from '@/stretches/segments';

export default function StretchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const counts = useMuscleCounts();
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const quickCount = useQuickRoutine().length;

  const quickAdd = (stretch: Stretch) => {
    addToQuick(stretch.id, 0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const [query, setQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<{ photos: (typeof stretchImages)[string]; frame: Rect } | null>(
    null
  );

  const openImage = (stretch: Stretch, frame: Rect) => {
    const photos = stretchImages[stretch.image];
    if (photos?.length) setLightbox({ photos, frame });
  };
  // Snapshot the usage-ordered pills on focus, so tapping one doesn't reshuffle them live.
  const [orderedMuscles, setOrderedMuscles] = useState<string[]>(() => allMuscles(stretches));

  useFocusEffect(
    useCallback(() => {
      setOrderedMuscles(orderByUsage(allMuscles(stretches), countsRef.current));
    }, [])
  );

  const filtered = useMemo(
    () => filterStretches(stretches, query, expandMuscleSelection(selectedMuscles)),
    [query, selectedMuscles]
  );

  const toggleMuscle = (token: string) =>
    setSelectedMuscles((prev) => {
      if (prev.includes(token)) return prev.filter((m) => m !== token);
      if (!isMuscleGroup(token)) bumpMuscle(token); // count only individual muscles, on select
      return [...prev, token];
    });

  const renderPill = (token: string) => {
    const active = selectedMuscles.includes(token);
    return (
      <Pressable key={token} onPress={() => toggleMuscle(token)}>
        <ThemedView
          type={active ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.pill, { borderColor: active ? theme.text : 'transparent' }]}>
          <Text style={[styles.pillText, { color: active ? theme.text : theme.textSecondary }]}>
            {muscleLabel(token)}
          </Text>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Stretches</ThemedText>
          <Pressable
            onPress={() => router.push('/quick-routine')}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}>
            <View>
              <SymbolView name="tray.full.fill" tintColor={theme.text} size={26} />
              {quickCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.text }]}>
                  <Text style={[styles.badgeText, { color: theme.background }]}>{quickCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
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
          style={styles.groupsScroll}
          contentContainerStyle={styles.pills}>
          {MUSCLE_GROUPS.map((g) => renderPill(g.name))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.pillsScroll}
          contentContainerStyle={styles.pills}>
          {orderedMuscles.map(renderPill)}
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
              onAdd={() => quickAdd(item)}
              onOpenImage={(frame) => openImage(item, frame)}
            />
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No stretches match your filters.
            </ThemedText>
          }
        />
      </SafeAreaView>

      {lightbox && (
        <ImageLightbox
          photos={lightbox.photos}
          initialIndex={0}
          sourceFrames={[lightbox.frame]}
          onClose={() => setLightbox(null)}
        />
      )}
    </ThemedView>
  );
}

function StretchRow({
  stretch,
  onPress,
  onAdd,
  onOpenImage,
}: {
  stretch: Stretch;
  onPress: () => void;
  onAdd: () => void;
  onOpenImage: (frame: Rect) => void;
}) {
  const theme = useTheme();
  const photo = stretchImages[stretch.image]?.[0];
  const thumbRef = useRef<View | null>(null);

  const openImage = async () => {
    const frame = await measureFrame(thumbRef.current);
    if (frame) onOpenImage(frame);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        ref={thumbRef}
        onPress={photo ? openImage : undefined}
        style={({ pressed }) => pressed && styles.pressed}>
        {photo ? (
          <Image source={photo} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
        )}
      </Pressable>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={1}>
            {stretch.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {stretch.muscles.join(', ') || 'stretch'}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        onPress={onAdd}
        hitSlop={10}
        style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
        <SymbolView name="plus.circle.fill" tintColor={theme.text} size={28} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', lineHeight: 18 },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  groupsScroll: { flexGrow: 0, height: 48, marginTop: Spacing.two },
  pillsScroll: { flexGrow: 0, height: 48, marginTop: Spacing.one, marginBottom: Spacing.two },
  pills: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  addBtn: { padding: Spacing.one },
  thumb: { width: 64, height: 64, borderRadius: Spacing.two },
  rowText: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.6 },
  empty: { textAlign: 'center', paddingTop: Spacing.five },
});
