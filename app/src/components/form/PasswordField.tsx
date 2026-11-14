import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { UI } from '../../forms/messages';
import { colors, fontSize, iconSize, lineHeight, spacing, textFont, touchTarget } from '../../theme';
import { TextField, type TextFieldProps, type TextFieldRef } from './TextField';

/**
 * A TextField for a password. "Tampilkan" sits inside the box at the right: eye + word, a labelled switch
 * (Figma 27:70), never an eye without a name.
 */
export const PasswordField = forwardRef<TextFieldRef, Omit<TextFieldProps, 'secureTextEntry' | 'accessory'>>(function PasswordField(props, ref) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!shown}
      accessory={
        <Pressable
          testID={props.testID ? `${props.testID}-toggle` : undefined}
          onPress={() => setShown((s) => !s)}
          accessibilityRole="switch"
          accessibilityLabel={UI.showPassword}
          accessibilityState={{ checked: shown }}
          hitSlop={spacing.sm}
          style={styles.toggle}
        >
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={iconSize.field} color={colors.text} accessible={false} />
          <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.text, textFont(true)]}>{shown ? 'Sembunyikan' : 'Tampilkan'}</Text>
        </Pressable>
      }
    />
  );
});

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + spacing.xs / 2, minHeight: touchTarget },
  text: { fontSize: fontSize.small, lineHeight: lineHeight.small - 2, color: colors.text },
});
