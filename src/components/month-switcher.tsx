import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, currentMonth, formatMonthLabel, type YearMonth } from '@/utils/dates';

/** "‹  November 2026  ›". Future months are disabled; tap the label to jump to this month. */
export function MonthSwitcher({
  month,
  onChange,
}: {
  month: YearMonth;
  onChange: (month: YearMonth) => void;
}) {
  const theme = useTheme();
  const thisMonth = currentMonth();
  const canGoNext = month < thisMonth;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={12}
        onPress={() => onChange(addMonths(month, -1))}
        style={styles.arrow}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityHint={month === thisMonth ? undefined : 'Jump to the current month'}
        onPress={() => onChange(thisMonth)}
        style={styles.label}>
        <ThemedText type="smallBold" style={styles.labelText}>
          {formatMonthLabel(month)}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        accessibilityState={{ disabled: !canGoNext }}
        disabled={!canGoNext}
        hitSlop={12}
        onPress={() => onChange(addMonths(month, 1))}
        style={[styles.arrow, !canGoNext && styles.disabled]}>
        <MaterialCommunityIcons name="chevron-right" size={28} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    padding: Spacing.two,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  labelText: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.25,
  },
});
