import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  type ImageSourcePropType,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { clampIndex, containRect, lerpRect, type Rect } from './geometry';

// Every library photo shares this aspect (see scripts/build-library.ts), so a
// single intrinsic size drives the fit-to-screen target for all of them.
const IMAGE_W = 850;
const IMAGE_H = 567;
const DURATION = 260;

type Phase = 'opening' | 'open' | 'closing';

/**
 * Full-screen image viewer that grows from the tapped thumbnail's measured
 * frame, lets you swipe between the photos, and shrinks back on close.
 *
 * `sourceFrames` are window-space rects of the thumbnails. Pass one per photo
 * (detail screen) to shrink back to whichever photo is active, or a single
 * frame (list row) to always shrink back to that thumbnail.
 */
export function ImageLightbox({
  photos,
  initialIndex,
  sourceFrames,
  onClose,
}: {
  photos: ImageSourcePropType[];
  initialIndex: number;
  sourceFrames: Rect[];
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = containRect(IMAGE_W, IMAGE_H, width, height);

  const [phase, setPhase] = useState<Phase>('opening');
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const sourceFor = (i: number) => sourceFrames[clampIndex(i, sourceFrames.length)];

  const progress = useSharedValue(0); // 0 = at thumbnail, 1 = full-screen
  const scrim = useSharedValue(0);
  const src = useSharedValue<Rect>(sourceFor(initialIndex));

  // Drive the grow/shrink off `phase`: 'opening' on mount, 'closing' on dismiss.
  useEffect(() => {
    if (phase === 'opening') {
      scrim.value = withTiming(1, { duration: DURATION });
      progress.value = withTiming(1, { duration: DURATION }, (done) => {
        if (done) scheduleOnRN(setPhase, 'open');
      });
    } else if (phase === 'closing') {
      scrim.value = withTiming(0, { duration: DURATION });
      progress.value = withTiming(0, { duration: DURATION }, (done) => {
        if (done) scheduleOnRN(onClose);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const close = () => {
    if (phase === 'closing') return;
    src.value = sourceFor(activeIndex); // shrink back to the active photo's thumbnail
    setPhase('closing');
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const heroStyle = useAnimatedStyle(() => {
    const r = lerpRect(src.value, full, progress.value);
    return { left: r.x, top: r.y, width: r.width, height: r.height };
  });

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActiveIndex(clampIndex(Math.round(e.nativeEvent.contentOffset.x / width), photos.length));

  const heroPhoto = phase === 'closing' ? photos[activeIndex] : photos[initialIndex];

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <View style={styles.fill}>
        <Animated.View style={[styles.scrim, scrimStyle]} />

        {phase === 'open' ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: initialIndex * width, y: 0 }}
            onMomentumScrollEnd={onMomentumEnd}
            style={styles.fill}>
            {photos.map((photo, i) => (
              <Pressable key={i} onPress={close} style={{ width, height }}>
                <Image source={photo} style={styles.fill} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Animated.View style={[styles.hero, heroStyle]}>
            <Image source={heroPhoto} style={styles.fill} contentFit="contain" />
          </Animated.View>
        )}

        {phase === 'open' && photos.length > 1 && (
          <View style={[styles.dots, { bottom: insets.bottom + Spacing.five }]}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {phase === 'open' && (
          <Pressable
            onPress={close}
            hitSlop={12}
            style={[styles.closeBtn, { top: insets.top + Spacing.two }]}>
            <SymbolView name="xmark.circle.fill" tintColor="white" size={30} />
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'black' },
  hero: { position: 'absolute' },
  closeBtn: { position: 'absolute', right: Spacing.three },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: 'white' },
});
