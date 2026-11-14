import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme';
import { CheckRow } from '../CheckRow';
import { FieldError } from './FieldError';

/** The existing CheckRow plus an error line (icon + text). */
export function Checkbox({ error, ...row }: { checked: boolean; onToggle: () => void; text: string; error?: string | null; testID?: string }) {
  return (
    <View style={styles.wrap}>
      <CheckRow {...row} />
      {error ? <FieldError text={error} testID={row.testID ? `${row.testID}-error` : undefined} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.xs } });
