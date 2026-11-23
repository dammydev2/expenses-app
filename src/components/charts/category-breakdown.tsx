import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { SERIES } from '@/constants/chart-palette';
import { Spacing } from '@/constants/theme';
import type { CategoryTotal } from '@/db/repos/reports';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatShare } from '@/utils/chart-math';
import { formatCents } from '@/utils/money';

/**
 * Every category, largest first: icon (identity, matches the donut), name, count,
 * amount, share, and a thin share bar. This is the chart's legend AND its table view,
 * so every value is readable without colour or tapping.
 */
export function CategoryBreakdown({
  totals,
  totalCents,
  selectedId,
  onSelect,
}: {
  totals: CategoryTotal[];
  totalCents: number;
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  const theme = useTheme();
  const series = SERIES[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View>
      {totals.map((t) => {
        const share = totalCents > 0 ? t.totalCents / totalCents : 0;
        const selected = selectedId === t.categoryId;
        return (
          <Pressable
            key={t.categoryId}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${t.name}: ${formatCents(t.totalCents)}, ${formatShare(share)} of total, ${t.count} ${t.count === 1 ? 'expense' : 'expenses'}`}
            onPress={() => onSelect(t.categoryId)}
            style={[styles.row, selected && { backgroundColor: theme.backgroundSelected }]}>
            <CategoryIcon icon={t.icon} color={t.color} size={36} />
            <View style={styles.body}>
              <View style={styles.line}>
                <ThemedText numberOfLines={1} style={styles.name}>
                  {t.name}
                </ThemedText>
                <ThemedText style={styles.amount}>{formatCents(t.totalCents)}</ThemedText>
              </View>
              <View style={styles.line}>
                <View style={[styles.track, { backgroundColor: series.track }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: series.fill, width: `${Math.max(share * 100, 1)}%` },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.share}>
                  {formatShare(share)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {t.count} {t.count === 1 ? 'expense' : 'expenses'}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  amount: {
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  share: {
    width: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
