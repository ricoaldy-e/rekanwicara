import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { FormantPoint, LipContour, Loudness, VowelAnchors } from '../api/types';
import { chart, colors } from '../theme';
import { toSvgPoints, lipRing, type LipShape, type Point } from './lipShapes';
import { downsample, loudnessXY, nearestAnchor, vowelMapXY } from './scale';

const LABEL = { fontSize: 15, fill: colors.textMuted } as const;

// ---------- Peta Vokal (SPEC §8.3) ----------

const MAP = { x: 40, y: 30, w: 240, h: 170 };
const mapPoint = (p: FormantPoint): Point => {
  const { x, y } = vowelMapXY(p);
  return [MAP.x + x * MAP.w, MAP.y + y * MAP.h];
};

export interface VowelMapProps {
  point: FormantPoint;
  anchors: VowelAnchors;
  testID?: string;
}

/** The user's a-i-u triangle with the attempt as a dot. F2 runs right to left, F1 top to bottom. */
export function VowelMap({ point, anchors, testID }: VowelMapProps) {
  const corners = (['a', 'i', 'u'] as const).flatMap((name) => {
    const anchor = anchors[name];
    return anchor ? [{ name, at: mapPoint(anchor) }] : [];
  });
  const near = nearestAnchor(point, anchors);
  const dot = mapPoint(point);
  return (
    <Svg
      testID={testID}
      width="100%"
      viewBox="0 0 320 250"
      style={{ aspectRatio: 320 / 250 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Peta vokal. Titik latihanmu paling dekat dengan bunyi ${near ?? 'sasaran'}.`}
    >
      <Rect x={MAP.x} y={MAP.y} width={MAP.w} height={MAP.h} fill={colors.surface} stroke={colors.border} strokeWidth={2} />
      {corners.length === 3 ? (
        <Polygon
          points={toSvgPoints(corners.map((c) => c.at))}
          fill={colors.infoBg}
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      ) : null}
      {corners.map(({ name, at }) => (
        <SvgText key={name} x={at[0]} y={at[1] + 6} fontSize={22} fontWeight="bold" fill={colors.primary} textAnchor="middle">
          {name}
        </SvgText>
      ))}
      <Circle cx={dot[0]} cy={dot[1]} r={9} fill={colors.text} stroke={colors.background} strokeWidth={3} />
      <SvgText x={dot[0]} y={dot[1] - 14} fontSize={16} fontWeight="bold" fill={colors.text} textAnchor="middle">
        kamu
      </SvgText>
      <SvgText x={160} y={18} textAnchor="middle" {...LABEL}>mulut rapat</SvgText>
      <SvgText x={160} y={222} textAnchor="middle" {...LABEL}>mulut terbuka</SvgText>
      <SvgText x={MAP.x} y={244} textAnchor="start" {...LABEL}>← bibir melebar</SvgText>
      <SvgText x={MAP.x + MAP.w} y={244} textAnchor="end" {...LABEL}>bibir membulat →</SvgText>
    </Svg>
  );
}

// ---------- Cermin Bibir (SPEC §8.3) ----------

const MIRROR = { x: 30, y: 20, w: 140, h: 100 };
const mirrorPoints = (ring: readonly Point[]): Point[] =>
  ring.map(([x, y]) => [MIRROR.x + x * MIRROR.w, MIRROR.y + y * MIRROR.h]);

export interface LipMirrorProps {
  user: LipContour;
  target: LipShape;
  testID?: string;
}

/** The user's lip line (solid) over the target shape (dashed). Both are scaled to the mouth box. */
export function LipMirror({ user, target, testID }: LipMirrorProps) {
  return (
    <Svg
      testID={testID}
      width="100%"
      viewBox="0 0 200 140"
      style={{ aspectRatio: 200 / 140 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Cermin bibir. Garis putus-putus adalah bentuk bibir target, garis tebal adalah bibirmu."
    >
      <Polygon
        points={toSvgPoints(mirrorPoints(lipRing(target)))}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeLinejoin="round"
      />
      <Polygon
        points={toSvgPoints(mirrorPoints(user.points))}
        fill={chart.userFill}
        stroke={colors.text}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------- Grafik kekerasan, Level 0 (SPEC §8.3) ----------

const CHART = { x: 10, y: 10, w: 280, h: 100 };
const MAX_CHART_POINTS = 150;

export interface LoudnessChartProps {
  loudness: Loudness;
  testID?: string;
}

/** Loudness over time; higher on the chart means louder. */
export function LoudnessChart({ loudness, testID }: LoudnessChartProps) {
  const all = loudnessXY(loudness.t_ms, loudness.db);
  const points: Point[] = downsample(all, MAX_CHART_POINTS).map(({ x, y }) => [CHART.x + x * CHART.w, CHART.y + y * CHART.h]);
  return (
    <Svg
      testID={testID}
      width="100%"
      viewBox="0 0 300 140"
      style={{ aspectRatio: 300 / 140 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Grafik kekerasan suara selama rekaman. Garis yang naik berarti suara makin keras."
    >
      <Rect x={CHART.x} y={CHART.y} width={CHART.w} height={CHART.h} fill={colors.surface} stroke={colors.border} strokeWidth={2} />
      <Line x1={CHART.x} y1={CHART.y + CHART.h} x2={CHART.x + CHART.w} y2={CHART.y + CHART.h} stroke={colors.border} strokeWidth={2} />
      {points.length > 1 ? (
        <Polyline points={toSvgPoints(points)} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinejoin="round" />
      ) : null}
      <SvgText x={CHART.x} y={134} textAnchor="start" {...LABEL}>awal</SvgText>
      <SvgText x={CHART.x + CHART.w} y={134} textAnchor="end" {...LABEL}>akhir</SvgText>
    </Svg>
  );
}
