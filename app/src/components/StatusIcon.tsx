import Svg, { Circle, G, Path } from 'react-native-svg';

import type { ResultStatus } from '../api/types';
import { colors, statusBadge, statusStyles } from '../theme';

const BOX = 18; // glyph geometry from Figma is drawn in an 18-unit box and scaled for lg
const RING = 2;
const MARK = 2.4;

/**
 * Status glyph (design.md §5.4, Figma status-glyph/*): three circle symbols that differ by fill, not only color:
 * filled circle + check, half-filled circle, outlined circle + replay arrow.
 */
export function StatusIcon({
  status,
  size = statusBadge.md.glyph,
  testID,
}: {
  status: ResultStatus;
  size?: number;
  testID?: string;
}) {
  const color = statusStyles[status].foreground;
  const k = size / BOX; // keeps stroke widths in dp at every size
  const line = { stroke: color, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg testID={testID} width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false}>
      <G scale={k}>
        {status === 'sesuai' ? (
          <>
            <Circle testID="status-shape-full" cx={9} cy={9} r={8.25} fill={color} />
            <Path d="M5.25 9.3 L7.8 11.775 L12.75 6.525" {...line} stroke={colors.background} strokeWidth={MARK / k} />
          </>
        ) : status === 'mendekati' ? (
          <>
            <Circle cx={9} cy={9} r={7.5} {...line} strokeWidth={RING / k} />
            <Path testID="status-shape-half" d="M9 2.4 A6.6 6.6 0 0 0 9 15.6 Z" fill={color} />
          </>
        ) : (
          <>
            <Circle testID="status-shape-retry" cx={9} cy={9} r={7.5} {...line} strokeWidth={RING / k} />
            <Path
              d="M11.7 7.2C11.2571 6.55831 10.61 6.08556 9.86399 5.8588C9.11802 5.63204 8.31723 5.66464 7.59216 5.9513C6.86709 6.23796 6.2605 6.76176 5.87127 7.43733C5.48203 8.11289 5.33311 8.90039 5.44876 9.67144C5.56442 10.4425 5.93784 11.1516 6.50816 11.6833C7.07847 12.2149 7.81205 12.5377 8.58932 12.599C9.36658 12.6603 10.1417 12.4565 10.7883 12.0209C11.4349 11.5852 11.9149 10.9434 12.15 10.2"
              {...line}
              strokeWidth={RING / k}
            />
            <Path d="M11.85 4.95 V7.5 H9.3" {...line} strokeWidth={RING / k} />
          </>
        )}
      </G>
    </Svg>
  );
}
