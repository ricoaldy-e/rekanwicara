import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { Source } from '../api/types';
import { colors, fontSize, iconSize, radius, textFont, wordList } from '../theme';

/**
 * Where a word comes from: the team ("Bawaan", lock) or the companion ("Dari Pendamping", person).
 * Icon + text on a `surfaceRaised` chip (Figma 37:414). `tall` is the slightly taller chip of "Jalur kata" (31:337).
 */
export function SourceChip({ source, tall = false }: { source: Source; tall?: boolean }) {
  const builtIn = source === 'default';
  return (
    <View style={[styles.chip, tall && styles.tall]}>
      <Ionicons name={builtIn ? 'lock-closed-outline' : 'person-outline'} size={iconSize.chip} color={colors.text} accessible={false} />
      <Text maxFontSizeMultiplier={2} style={[styles.text, textFont(true)]}>{builtIn ? 'Bawaan' : 'Dari Pendamping'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wordList.chipGap,
    paddingHorizontal: wordList.chipPaddingHorizontal,
    paddingVertical: wordList.chipPaddingVertical,
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
  },
  tall: { paddingVertical: wordList.chipPaddingVerticalLarge },
  text: { fontSize: fontSize.small, lineHeight: 20, color: colors.text },
});
