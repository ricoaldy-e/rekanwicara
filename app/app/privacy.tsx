import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { InfoSection, Screen } from '../src/components';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../src/content/privacy';
import { colors, displayFont, fontSize, layout, lineHeight, spacing, textFont } from '../src/theme';

/** Kebijakan Privasi (Figma "Kebijakan privasi"): readable before signing in, linked from Daftar and Tentang. */
export default function Privacy() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <Screen edges={['bottom', 'left', 'right']} contentStyle={styles.content}>
      <Stack.Screen options={{ headerBackTitle: from }} />
      <View style={styles.intro}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={[styles.title, displayFont()]}>Kebijakan Privasi</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.body, styles.muted, textFont()]}>{PRIVACY_INTRO}</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.small, styles.muted, textFont()]}>Diperbarui {PRIVACY_UPDATED}</Text>
      </View>
      <View>
        {PRIVACY_SECTIONS.map((section, i) => (
          <InfoSection key={section.title} title={section.title} first={i === 0}>
            {section.paragraphs.map((p) => (
              <Text key={p} maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>{p}</Text>
            ))}
          </InfoSection>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: layout.groupGap },
  intro: { gap: spacing.sm },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  small: { fontSize: fontSize.small, lineHeight: lineHeight.small },
  muted: { color: colors.textMuted },
});
