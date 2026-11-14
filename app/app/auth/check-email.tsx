import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, BigButton, InfoNote, Screen } from '../../src/components';
import { colors, displayFont, entry, fontSize, lineHeight, spacing, textFont } from '../../src/theme';

/** AUTH-8: the account exists but the email must be confirmed before signing in (Figma 27:234). */
export default function CheckEmail() {
  const router = useRouter();
  const toSignIn = () => router.replace('/auth/sign-in');
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <BigButton label="Ke halaman Masuk" icon="log-in-outline" onPress={toSignIn} />
          <BigButton label="Daftar ulang" variant="secondary" onPress={() => router.replace('/auth/sign-up')} testID="check-email-resend" />
        </View>
      }
    >
      <View style={styles.back}>
        <BackButton label="Ke Masuk" onPress={toSignIn} testID="check-email-back" />
      </View>
      <View style={styles.center}>
        <Ionicons name="mail-outline" size={entry.checkEmail.icon} color={colors.text} accessible={false} style={styles.mail} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>Cek email</Text>
        <InfoNote text="Buka email untuk konfirmasi, lalu masuk." testID="check-email-note" />
        <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>Tidak ada email? Periksa folder spam, atau daftar ulang dengan email yang benar.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: entry.gutter, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.lg - spacing.xs },
  back: { alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: spacing.lg - spacing.xs },
  mail: { alignSelf: 'center', width: entry.checkEmail.circle, height: entry.checkEmail.circle, textAlign: 'center', textAlignVertical: 'center', lineHeight: entry.checkEmail.circle },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text, textAlign: 'center' },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: spacing.sm + spacing.xs, paddingHorizontal: entry.gutter, paddingBottom: spacing.lg },
});
