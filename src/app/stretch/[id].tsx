import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Rect } from '@/components/lightbox/geometry';
import { ImageLightbox } from '@/components/lightbox/image-lightbox';
import { measureFrame } from '@/components/lightbox/measure';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addToQuick } from '@/routines/quickRoutine';
import { stretchImages } from '@/stretches/images';
import { stretches } from '@/stretches/library';
import { formatDuration, optionDuration, type TimeOption } from '@/stretches/segments';

function describeOption(option: TimeOption): { title: string; subtitle?: string } {
  const total = formatDuration(optionDuration(option));
  if (option.kind === 'hold') return { title: total };
  return { title: total, subtitle: `2 × ${option.secondsPerSide}s per side` };
}

export default function StretchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const stretch = stretches.find((s) => s.id === id);

  const photoRefs = useRef<(View | null)[]>([]);
  const [lightbox, setLightbox] = useState<{ index: number; frames: Rect[] } | null>(null);

  const openLightbox = async (index: number, count: number) => {
    const frames = await Promise.all(
      photoRefs.current.slice(0, count).map((node) => measureFrame(node))
    );
    if (frames.some((f) => f == null)) return;
    setLightbox({ index, frames: frames as Rect[] });
  };

  if (!stretch) {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText>Stretch not found.</ThemedText>
      </ThemedView>
    );
  }

  const photos = stretchImages[stretch.image] ?? [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: stretch.name,
          headerRight: () => (
            <Pressable
              onPress={() => {
                addToQuick(stretch.id, 0);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressed}>
              <SymbolView name="plus.circle.fill" tintColor={theme.accent} size={26} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {photos.length > 0 && (
          <View style={styles.photos}>
            {photos.map((photo, i) => (
              <Pressable
                key={i}
                ref={(node) => {
                  photoRefs.current[i] = node;
                }}
                onPress={() => openLightbox(i, photos.length)}
                style={({ pressed }) => [styles.photoWrap, pressed && styles.pressed]}>
                <Image source={photo} style={styles.photo} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <ThemedText type="subtitle">{stretch.name}</ThemedText>

        {stretch.muscles.length > 0 && (
          <View style={styles.tags}>
            {stretch.muscles.map((m) => (
              <ThemedView key={m} type="backgroundElement" bordered style={styles.tag}>
                <ThemedText type="small" themeColor="textSecondary">
                  {m}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        )}

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          CHOOSE A TIME
        </ThemedText>
        <View style={styles.options}>
          {stretch.options.map((option, index) => {
            const { title, subtitle } = describeOption(option);
            return (
              <Pressable
                key={index}
                onPress={() =>
                  router.push({ pathname: '/run', params: { id: stretch.id, option: String(index) } })
                }
                style={({ pressed }) => [pressed && styles.pressed, styles.optionWrap]}>
                <ThemedView type="backgroundElement" bordered style={styles.option}>
                  <ThemedText type="default">{title}</ThemedText>
                  {subtitle && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {subtitle}
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            );
          })}
        </View>

        {stretch.instructions.length > 0 && (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              HOW TO
            </ThemedText>
            <View style={styles.steps}>
              {stretch.instructions.map((step, i) => (
                <View key={i} style={styles.step}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.stepNum}>
                    {i + 1}
                  </ThemedText>
                  <ThemedText type="small" style={styles.stepText}>
                    {step}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {lightbox && (
        <ImageLightbox
          photos={photos}
          initialIndex={lightbox.index}
          sourceFrames={lightbox.frames}
          onClose={() => setLightbox(null)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  photos: { flexDirection: 'row', gap: Spacing.two },
  photoWrap: { flex: 1 },
  photo: { width: '100%', aspectRatio: 850 / 567, borderRadius: Radius.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.full },
  label: { letterSpacing: 1, marginTop: Spacing.one, textTransform: 'uppercase' },
  options: { gap: Spacing.two },
  optionWrap: {},
  option: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.half,
  },
  pressed: { opacity: 0.6 },
  steps: { gap: Spacing.two },
  step: { flexDirection: 'row', gap: Spacing.two },
  stepNum: { width: 18, textAlign: 'right' },
  stepText: { flex: 1 },
});
