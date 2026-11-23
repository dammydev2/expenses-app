import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ExpenseWithCategory } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/utils/money';

export function ExpenseRow({
  expense,
  onPress,
}: {
  expense: ExpenseWithCategory;
  onPress: () => void;
}) {
  const theme = useTheme();
  const amount = formatCents(expense.amountCents, expense.currency);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.categoryName}, ${amount}${expense.note ? `, ${expense.note}` : ''}`}
      accessibilityHint="Edit this expense"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
      ]}>
      <CategoryIcon icon={expense.categoryIcon} color={expense.categoryColor} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{expense.categoryName}</ThemedText>
        {expense.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {expense.note}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={styles.amount}>{amount}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  text: {
    flex: 1,
  },
  amount: {
    fontVariant: ['tabular-nums'],
    fontWeight: 600,
  },
});
