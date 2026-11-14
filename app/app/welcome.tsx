import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton, LogoMark, Screen } from '../src/components';
import { colors, displayFont, entry, fontSize, lineHeight, spacing, textFont } from '../src/theme';

/**
 * Selamat datang (design.md §6.8, Figma 106:646): the first screen for someone who is signed out.
 * "Masuk" and "Buat akun" lead to the existing account screens.
 */
export default function Welcome() {
  const router = useRouter();
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <BigButton label="Masuk" onPress={() => router.push('/auth/sign-in')} testID="welcome-sign-in" />
          <BigButton label="Buat akun" variant="secondary" onPress={() => router.push('/auth/sign-up')} testID="welcome-sign-up" />
          <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>Alat bantu latihan, bukan pengganti terapis wicara.</Text>
        </View>
      }
    >
      <View style={styles.logo}>
        <LogoMark size={entry.welcomeLogo} testID="welcome-logo" />
      </View>
      <View style={styles.text}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={[styles.title, displayFont()]}>Berlatih bicara dengan melihat.</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>Lihat bentuk bibirmu, rasakan getarnya, lalu ulangi sampai terasa pas.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: entry.welcomeGutter, paddingTop: spacing.sm, gap: spacing.lg },
  logo: { minHeight: entry.welcomeLogoArea, alignItems: 'center', justifyContent: 'center' },
  text: { gap: spacing.sm + spacing.xs / 2 },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text, textAlign: 'center' },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted, textAlign: 'center' },
  footer: { gap: spacing.sm + spacing.xs, paddingHorizontal: entry.welcomeGutter, paddingBottom: spacing.xl + spacing.sm, paddingTop: spacing.sm },
  note: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
