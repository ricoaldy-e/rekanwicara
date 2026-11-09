import { Redirect } from 'expo-router';

/** B0: always start at onboarding. B2 will skip it once onboarding is completed. */
export default function Index() {
  return <Redirect href="/onboarding" />;
}
