import { StyleSheet, View } from 'react-native';

import { UI } from '../../forms/messages';
import { spacing } from '../../theme';
import { BigButton } from '../BigButton';
import { InfoNote } from '../InfoNote';

/** A failure of the whole form (e.g. no connection): icon + text and "Coba lagi". The typed values stay. */
export function FormBanner({ text, onRetry, testID }: { text: string; onRetry?: () => void; testID?: string }) {
  return (
    <View style={styles.wrap}>
      <InfoNote tone="warning" text={text} testID={testID} />
      {onRetry ? <BigButton label={UI.retry} icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.sm } });
