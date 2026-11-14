import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { BigButton } from '../components/BigButton';
import { Body } from '../components/Typography';
import { splitSteps } from '../forms/instructionSteps';
import { carousel, colors, fontSize, lineHeight, radius, spacing, stroke, textFont } from '../theme';

/**
 * The instruction of a material, one step per card, so it can be read while the video plays (Figma "Latihan · Lihat").
 * Swiping is a convenience only: "Sebelumnya" and "Berikutnya" do the same, so no gesture is required.
 * One step (or an old one-paragraph instruction) is plain text, as before.
 */
export function InstructionCarousel({ text }: { text: string }) {
  const steps = splitSteps(text);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const reduce = useReduceMotion();

  if (steps.length <= 1) return <Body>{text}</Body>;

  const last = steps.length - 1;
  const go = (to: number) => {
    const next = Math.min(last, Math.max(0, to));
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: !reduce });
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.min(last, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))));
  };
  const counter = `Langkah ${index + 1} dari ${steps.length}`;

  return (
    <View style={styles.wrap} testID="instruction-carousel" onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={2} style={[styles.counter, textFont()]} testID="instruction-counter">{counter}</Text>
      {width > 0 ? (
        <ScrollView ref={scroller} testID="instruction-scroller" horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onEnd} style={styles.scroller}>
          {steps.map((step, i) => (
            <Card key={i} width={width} n={i + 1} total={steps.length} text={step} />
          ))}
        </ScrollView>
      ) : (
        <Card width={undefined} n={1} total={steps.length} text={steps[0]} />
      )}
      <View style={styles.controls}>
        <View style={styles.cell}>
          <BigButton compact label="Sebelumnya" icon="chevron-back" variant="secondary" disabled={index === 0} onPress={() => go(index - 1)} testID="instruction-prev" />
        </View>
        {/* Decorative: the counter above carries the position. */}
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === index ? styles.dotOn : styles.dotOff]} />
          ))}
        </View>
        <View style={styles.cell}>
          <BigButton compact label="Berikutnya" icon="chevron-forward" iconAfter variant="secondary" disabled={index === last} onPress={() => go(index + 1)} testID="instruction-next" />
        </View>
      </View>
    </View>
  );
}

function Card({ width, n, total, text }: { width: number | undefined; n: number; total: number; text: string }) {
  return (
    <View style={{ width }} accessible accessibilityLabel={`Langkah ${n} dari ${total}. ${text}`}>
      <View style={styles.card}>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.cardLabel, textFont(true)]}>Langkah {n}</Text>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.cardText, textFont()]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm + spacing.xs },
  counter: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  scroller: { flexGrow: 0 },
  card: { gap: spacing.xs + spacing.xs / 2, padding: spacing.md, borderRadius: radius.card, borderWidth: stroke.hairline, borderColor: colors.hairline, backgroundColor: colors.surface },
  cardLabel: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  cardText: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cell: { flexShrink: 1 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: carousel.dotGap },
  dot: { width: carousel.dot, height: carousel.dot, borderRadius: carousel.dot / 2 },
  dotOn: { backgroundColor: colors.text },
  dotOff: { backgroundColor: colors.surfaceRaised },
});
