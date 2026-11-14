import { Image, StyleSheet } from 'react-native';

// The logo from Figma "Logo/Mark": a rounded green tile, PNG with an alpha channel.
const SOURCE = require('../../assets/images/logo-mark.png');

/** Brand mark (design.md §5.9). Decorative: the wordmark next to it carries the name. */
export function LogoMark({ size, testID }: { size: number; testID?: string }) {
  return <Image testID={testID} source={SOURCE} accessible={false} resizeMode="contain" style={[styles.image, { width: size, height: size }]} />;
}

const styles = StyleSheet.create({ image: { flexShrink: 0 } });
