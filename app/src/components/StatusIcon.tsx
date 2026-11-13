import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { Status } from '../api/types';
import { statusStyles } from '../theme';

const BOX = 22;
const STROKE = 3.5;
const MARK = 2.4;

/**
 * Status icon with a different outer shape per status, so it reads in black and white
 * (design.md §5.3): circle + check, triangle + ≈, rounded square + turning arrow.
 */
export function StatusIcon({ status, size = 22, testID }: { status: Status; size?: number; testID?: string }) {
  const color = statusStyles[status].foreground;
  const common = { stroke: color, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const k = size / BOX; // draw in a 22-unit box; keep stroke widths in dp
  return (
    <Svg testID={testID} width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false}>
      <G scale={k}>
        {status === 'hijau' ? (
          <>
            <Circle testID="status-shape-circle" cx={11} cy={11} r={9} {...common} strokeWidth={STROKE / k} />
            <Path d="M6.8 11.4 L9.6 14.2 L15.2 8.2" {...common} strokeWidth={MARK / k} />
          </>
        ) : status === 'kuning' ? (
          <>
            <Path testID="status-shape-triangle" d="M11 2.8 L19.6 18.6 L2.4 18.6 Z" {...common} strokeWidth={STROKE / k} />
            <Path d="M8 12 q1.5 -1.5 3 0 t3 0 M8 15.2 q1.5 -1.5 3 0 t3 0" {...common} strokeWidth={(MARK - 0.6) / k} />
          </>
        ) : (
          <>
            <Rect testID="status-shape-square" x={2.4} y={2.4} width={17.2} height={17.2} rx={4} {...common} strokeWidth={STROKE / k} />
            <Path d="M14.5 8 A4.5 4.5 0 1 0 14.9 13.3 M16.6 10.6 L14.9 13.3 L12 12.4" {...common} strokeWidth={(MARK - 0.4) / k} />
          </>
        )}
      </G>
    </Svg>
  );
}
