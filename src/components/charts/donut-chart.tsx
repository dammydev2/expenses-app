import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { categoryColor } from '@/constants/chart-palette';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { donutPaths, formatShare, type Slice } from '@/utils/chart-math';
import { formatCents } from '@/utils/money';

const SIZE = 208;
const OUTER = SIZE / 2;
const THICKNESS = 26; // thin ring; also a comfortable (>24px) touch target
const GAP = 2; // surface gap between segments

/**
 * Part-to-whole donut: ≤ 5 named slices + "Other", 2px surface gaps, total in the centre.
 * Tapping a slice shows its amount in the centre; the breakdown list below the chart
 * carries every name and figure, so nothing depends on colour or tapping alone.
 */
export function DonutChart({
  slices,
  totalCents,
  selectedKey,
  onSelect,
}: {
  slices: Slice[];
  totalCents: number;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const scheme = useColorScheme();
  const paths = donutPaths(
    slices.map((s) => s.totalCents),
    { cx: OUTER, cy: OUTER, outer: OUTER, inner: OUTER - THICKNESS, gap: GAP },
  );
  const selected = slices.find((s) => s.key === selectedKey) ?? null;

  const summary = slices.map((s) => `${s.label} ${formatShare(s.share)}`).join(', ');

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Spending by category: ${summary}`}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {slices.map((slice, index) =>
          paths[index] ? (
            <Path
              key={slice.key}
              d={paths[index]}
              fill={categoryColor(slice.color, scheme)}
              fillRule="evenodd"
              opacity={selectedKey && selectedKey !== slice.key ? 0.3 : 1}
              onPress={() => onSelect(selectedKey === slice.key ? null : slice.key)}
            />
          ) : null,
        )}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {selected ? (
          <>
            <ThemedText style={styles.centerValue}>{formatCents(selected.totalCents)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {selected.label} · {formatShare(selected.share)}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText style={styles.centerValue}>{formatCents(totalCents)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              total
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THICKNESS + 12,
  },
  centerValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
});
