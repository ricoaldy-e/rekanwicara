import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, displayFont, fontSize, homeList, lineHeight, radius, stroke } from '../theme';

export interface LetterTileProps {
  letter?: string;
  /** Used instead of the letter, e.g. a speaker for loudness. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `raised`: filled tile (lists, Figma 37:288). `outline`: hairline tile (home activity, Figma 57:475). */
  tone?: 'raised' | 'outline';
  /** 24 dp letter (lists) instead of 20 dp (home activity). */
  large?: boolean;
  /** Grows to fit a longer text such as "ma" or "mama" (Jalur kata). */
  wide?: boolean;
}

/** Decorative 44 dp tile with a serif letter. The row around it carries the accessible name. */
export function LetterTile({ letter, icon, tone = 'raised', large = false, wide = false }: LetterTileProps) {
  return (
    <View style={[styles.tile, tone === 'raised' ? styles.raised : styles.outline, wide && styles.wide]}>
      {icon ? (
        <Ionicons name={icon} size={fontSize.title} color={colors.text} accessible={false} />
      ) : (
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.letter, large && styles.letterLarge, displayFont()]}>
          {letter}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: homeList.letterTile, height: homeList.letterTile, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  raised: { backgroundColor: colors.surfaceRaised },
  outline: { borderWidth: stroke.hairline, borderColor: colors.hairline },
  wide: { width: undefined, minWidth: homeList.letterTile, paddingHorizontal: 12 },
  letter: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  letterLarge: { fontSize: fontSize.title, lineHeight: lineHeight.title },
});
