import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { CHART_CHROME, SERIES } from '@/constants/chart-palette';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { columnPath, niceAxis, type DayPoint } from '@/utils/chart-math';
import { formatAxisAmount } from '@/utils/money';

const PLOT_HEIGHT = 150;
const X_AXIS_BAND = 22; // room for day labels: the container includes it (no nested scroll)
const Y_AXIS_WIDTH = 44;
const TOP_PAD = 8;
const MAX_BAR = 24;
const BAR_GAP = 2;
const X_LABEL_DAYS = new Set([1, 8, 15, 22, 29]);

/**
 * Spending per day: one series (slot-1 blue), thin columns with 4px rounded tops,
 * hairline gridlines, clean whole-currency ticks. Touch or drag across the plot to
 * select the nearest day (the whole column is the hit target, not just the bar).
 */
export function DailyBarChart({
  points,
  selectedIndex,
  onSelect,
}: {
  points: DayPoint[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const chrome = CHART_CHROME[scheme];
  const series = SERIES[scheme];
  const [width, setWidth] = useState(0);

  const maxCents = Math.max(0, ...points.map((p) => p.totalCents));
  const axis = niceAxis(maxCents);
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH);
  const slot = points.length ? plotWidth / points.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot - BAR_GAP));
  const baselineY = TOP_PAD + PLOT_HEIGHT;
  const yFor = (cents: number) => baselineY - (cents / axis.top) * PLOT_HEIGHT;

  function indexAt(event: GestureResponderEvent): number | null {
    const x = event.nativeEvent.locationX;
    if (slot <= 0) return null;
    const index = Math.floor(x / slot);
    return index >= 0 && index < points.length ? index : null;
  }

  const handleTouch = (event: GestureResponderEvent) => {
    const index = indexAt(event);
    if (index !== null && !points[index].isFuture) onSelect(index);
  };

  return (
    <View
      style={{ height: TOP_PAD + PLOT_HEIGHT + X_AXIS_BAND }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={TOP_PAD + PLOT_HEIGHT + X_AXIS_BAND}>
          {/* Gridlines + y labels */}
          {axis.ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <Line
                key={`grid-${tick}`}
                x1={Y_AXIS_WIDTH}
                x2={width}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chrome.axis : chrome.grid}
                strokeWidth={1}
              />
            );
          })}
          {axis.ticks.map((tick) => (
            <SvgText
              key={`label-${tick}`}
              x={Y_AXIS_WIDTH - 6}
              y={yFor(tick) + 4}
              fontSize={11}
              fill={chrome.muted}
              textAnchor="end">
              {formatAxisAmount(tick)}
            </SvgText>
          ))}

          {/* Columns */}
          {points.map((point, index) => {
            const height = (point.totalCents / axis.top) * PLOT_HEIGHT;
            const x = Y_AXIS_WIDTH + index * slot + (slot - barWidth) / 2;
            const d = columnPath(x, baselineY, barWidth, height);
            if (!d) return null;
            const dimmed = selectedIndex !== null && selectedIndex !== index;
            return <Path key={point.day} d={d} fill={series.fill} opacity={dimmed ? 0.3 : 1} />;
          })}

          {/* Day labels */}
          {points.map((point, index) =>
            X_LABEL_DAYS.has(point.dayOfMonth) ? (
              <SvgText
                key={`x-${point.day}`}
                x={Y_AXIS_WIDTH + index * slot + slot / 2}
                y={baselineY + 16}
                fontSize={11}
                fill={chrome.muted}
                textAnchor="middle">
                {String(point.dayOfMonth)}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}

      {/* Touch layer over the plot area: nearest-day selection with drag-to-scrub. */}
      <View
        style={[styles.touchLayer, { left: Y_AXIS_WIDTH, height: TOP_PAD + PLOT_HEIGHT + X_AXIS_BAND }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderTerminationRequest={() => true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
