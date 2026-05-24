import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuickRoutine } from '@/routines/quickRoutine';
import { itemsDuration } from '@/routines/resolve';
import { createRoutine, useRoutines } from '@/routines/store';
import { formatDuration } from '@/stretches/segments';

export default function RoutinesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const routines = useRoutines();
  const quickItems = useQuickRoutine();
  const quickCount = quickItems.length;

  const onNew = () => {
    const routine = createRoutine('New routine');
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Routines</ThemedText>
          <Pressable onPress={onNew} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
            <SymbolView name="plus.circle.fill" tintColor={theme.accent} size={30} />
          </Pressable>
        </View>

        <FlatList
          data={routines}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            quickCount > 0 ? (
              <Pressable
                onPress={() => router.push('/quick-routine')}
                style={({ pressed }) => [styles.quickWrap, pressed && styles.pressed]}>
                <ThemedView type="backgroundSelected" bordered style={styles.row}>
                  <SymbolView name="play.square.stack.fill" tintColor={theme.accent} size={22} />
                  <View style={styles.rowText}>
                    <ThemedText type="default">Queue</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {quickCount} {quickCount === 1 ? 'stretch' : 'stretches'} ·{' '}
                      {formatDuration(itemsDuration(quickItems))}
                    </ThemedText>
                  </View>
                  <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={16} />
                </ThemedView>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/routine/[id]', params: { id: item.id } })}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" bordered style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText type="default" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.items.length} {item.items.length === 1 ? 'stretch' : 'stretches'}
                    {item.items.length > 0 ? ` · ${formatDuration(itemsDuration(item.items))}` : ''}
                  </ThemedText>
                </View>
                <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={16} />
              </ThemedView>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No routines yet. Tap + to build one.
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six },
  quickWrap: { marginBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  rowText: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.6 },
  empty: { textAlign: 'center', paddingTop: Spacing.five },
});
