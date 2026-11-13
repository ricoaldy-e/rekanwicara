import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UI } from '../../forms/messages';
import { colors, fontSize, spacing, touchTarget } from '../../theme';
import { TextField, type TextFieldProps, type TextFieldRef } from './TextField';

/** A TextField for a password, with a labelled "Tampilkan sandi" switch (not an eye icon without a name). */
export const PasswordField = forwardRef<TextFieldRef, Omit<TextFieldProps, 'secureTextEntry'>>(function PasswordField(props, ref) {
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextField
        ref={ref}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        secureTextEntry={!shown}
      />
      <Pressable
        testID={props.testID ? `${props.testID}-toggle` : undefined}
        onPress={() => setShown((s) => !s)}
        accessibilityRole="switch"
        accessibilityLabel={UI.showPassword}
        accessibilityState={{ checked: shown }}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{shown ? UI.hidePassword : UI.showPassword}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  toggle: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  toggleText: { fontSize: fontSize.label, fontWeight: '700', color: colors.text, textDecorationLine: 'underline' },
});
