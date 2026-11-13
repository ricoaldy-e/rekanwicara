import { useRouter } from 'expo-router';

import { BigButton, Body, InfoNote, Screen, Title } from '../../src/components';

/** AUTH-8: the account exists but the email must be confirmed before signing in. */
export default function CheckEmail() {
  const router = useRouter();
  return (
    <Screen>
      <Title>Cek email</Title>
      <InfoNote text="Buka email untuk konfirmasi, lalu masuk." testID="check-email-note" />
      <Body muted>Tidak ada email? Periksa folder spam, atau daftar ulang dengan email yang benar.</Body>
      <BigButton label="Ke halaman Masuk" icon="log-in-outline" onPress={() => router.replace('/auth/sign-in')} />
    </Screen>
  );
}
