import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { colors, displayFont, entry, fontSize, lineHeight, spacing, splashMotion as m, textFont } from '../theme';
import { LogoMark } from './LogoMark';

// Animated value at which the fill sits at the left edge of the track (the still Figma state).
const BAR_REST = entry.splashBar.fill / (entry.splashBar.fill + entry.splashBar.width);

type Props = {
  /** The start gate has decided where to go; the screen fades out as soon as the intro has also finished. */
  ready: boolean;
  /** False when the intro already played in this launch: show the final state and leave as soon as `ready`. */
  animate: boolean;
  onDone: () => void;
};

/**
 * "Splash · Memuat" (Figma 106:627) with an opening animation: the logo appears where the native splash drew it,
 * glides up, then the name, the tagline and the product note fade in. With Reduce Motion it is shown at once.
 */
export function SplashIntro({ ready, animate, onDone }: Props) {
  const reduce = useReduceMotion();
  const instant = reduce || !animate;
  const { height } = useWindowDimensions();
  const [shift, setShift] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const from = animate ? 0 : 1;
  const v = useRef({
    logo: new Animated.Value(0), logoY: new Animated.Value(0), name: new Animated.Value(from), nameY: new Animated.Value(0),
    tagline: new Animated.Value(from), taglineY: new Animated.Value(0), foot: new Animated.Value(from), bar: new Animated.Value(0), screen: new Animated.Value(1),
  }).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Where the native splash puts the logo: the middle of the window. The glide starts from there.
  const onLogoLayout = (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    setShift(height / 2 - (y + h / 2));
  };

  useEffect(() => {
    if (shift === null) return;
    v.logo.setValue(1);
    if (instant) {
      [v.name, v.tagline, v.foot].forEach((a) => a.setValue(1));
      [v.logoY, v.nameY, v.taglineY].forEach((a) => a.setValue(0));
      v.bar.setValue(BAR_REST);
      const timer = setTimeout(() => setHeld(true), animate ? m.reducedRest : 0);
      return () => clearTimeout(timer);
    }
    v.logoY.setValue(shift);
    v.nameY.setValue(m.nameRise);
    v.taglineY.setValue(m.taglineRise);
    const to = (value: Animated.Value, toValue: number, duration: number, delay: number) =>
      Animated.timing(value, { toValue, duration, delay, easing: Easing.bezier(...m.ease), useNativeDriver: true });
    const run = Animated.sequence([
      Animated.delay(m.hold),
      Animated.parallel([
        to(v.logoY, 0, m.glide, 0),
        to(v.name, 1, m.nameFade, m.nameDelay), to(v.nameY, 0, m.nameFade, m.nameDelay),
        to(v.tagline, 1, m.taglineFade, m.taglineDelay), to(v.taglineY, 0, m.taglineFade, m.taglineDelay),
        to(v.foot, 1, m.footFade, m.footDelay),
      ]),
    ]);
    // Indeterminate: it moves while the app waits and says nothing about how far along it is.
    const sweep = Animated.loop(Animated.timing(v.bar, { toValue: 1, duration: m.bar, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    v.bar.setValue(0);
    sweep.start();
    let timer: ReturnType<typeof setTimeout> | undefined;
    run.start(({ finished }) => {
      if (finished) timer = setTimeout(() => setHeld(true), m.rest);
    });
    return () => {
      run.stop();
      sweep.stop();
      clearTimeout(timer);
    };
  }, [shift, instant, animate, v]);

  useEffect(() => {
    if (!held || !ready) return;
    if (instant) {
      doneRef.current();
      return;
    }
    const exit = Animated.timing(v.screen, { toValue: 0, duration: m.exit, easing: Easing.out(Easing.quad), useNativeDriver: true });
    exit.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => exit.stop();
  }, [held, ready, instant, v]);

  return (
    <Animated.View
      accessible
      accessibilityLabel="Memuat"
      accessibilityLiveRegion="polite"
      style={[styles.screen, { opacity: v.screen }]}
      testID="splash-loading"
    >
      <View style={styles.center}>
        <Animated.View onLayout={onLogoLayout} testID="splash-logo" style={{ opacity: v.logo, transform: [{ translateY: v.logoY }] }}>
          <LogoMark size={entry.splashLogo} />
        </Animated.View>
        <View style={styles.names}>
          <Animated.Text
            maxFontSizeMultiplier={1.5}
            style={[styles.name, displayFont(), { opacity: v.name, transform: [{ translateY: v.nameY }] }]}
            testID="splash-name"
          >
            Rekan Wicara
          </Animated.Text>
          <Animated.Text
            maxFontSizeMultiplier={2}
            style={[styles.tagline, textFont(), { opacity: v.tagline, transform: [{ translateY: v.taglineY }] }]}
          >
            Latihan bicara dengan bantuan visual
          </Animated.Text>
        </View>
      </View>
      <Animated.View style={[styles.bottom, { opacity: v.foot }]}>
        {/* Decorative: a still bar, it does not report progress. */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ translateX: v.bar.interpolate({ inputRange: [0, 1], outputRange: [-entry.splashBar.fill, entry.splashBar.width] }) }] }]} />
        </View>
        <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>Alat bantu latihan, bukan pengganti terapis wicara.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: entry.welcomeGutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg + spacing.xs },
  names: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.display, lineHeight: lineHeight.display, color: colors.text, textAlign: 'center' },
  tagline: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted, textAlign: 'center' },
  bottom: { alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.xl + spacing.md },
  track: { width: entry.splashBar.width, height: entry.splashBar.height, borderRadius: entry.splashBar.height, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { width: entry.splashBar.fill, height: entry.splashBar.height, borderRadius: entry.splashBar.height, backgroundColor: colors.textMuted },
  note: { maxWidth: 300, fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
