import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseRow } from '@/components/expense-row';
import { MonthSwitcher } from '@/components/month-switcher';
import { Snackbar } from '@/components/snackbar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { restoreExpense } from '@/db/repos/expenses';
import type { ExpenseWithCategory } from '@/db/types';
import { useMonthExpenses } from '@/hooks/use-month-expenses';
import { useTheme } from '@/hooks/use-theme';
import { undoDeleteStore, useDeletedExpense } from '@/stores/undo-delete';
import { currentMonth, defaultDateForMonth, formatDayHeader, type ISODate } from '@/utils/dates';
import { formatCents, sumCents } from '@/utils/money';

type DaySection = { day: ISODate; total: number; data: ExpenseWithCategory[] };

/** Group expenses (already sorted newest first) into one section per day. */
function groupByDay(expenses: ExpenseWithCategory[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const expense of expenses) {
    const last = sections.at(-1);
    if (last && last.day === expense.spentOn) {
      last.data.push(expense);
      last.total += expense.amountCents;
    } else {
      sections.push({ day: expense.spentOn, total: expense.amountCents, data: [expense] });
    }
  }
  return sections;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth());
  const { expenses, loading, error, reload } = useMonthExpenses(month);
  const deleted = useDeletedExpense();

  const sections = useMemo(() => groupByDay(expenses), [expenses]);
  const total = useMemo(() => sumCents(expenses.map((e) => e.amountCents)), [expenses]);

  const dismissSnackbar = useCallback(() => undoDeleteStore.set(null), []);

  async function undoDelete() {
    if (!deleted) return;
    undoDeleteStore.set(null);
    await restoreExpense(db, deleted.id);
    await reload();
  }

  function openSummary() {
    router.push({ pathname: '/summary', params: { month } });
  }

  function addExpense() {
    router.push({ pathname: '/expense/new', params: { date: defaultDateForMonth(month) } });
  }

  const header = (
    <View style={styles.header}>
      <MonthSwitcher month={month} onChange={setMonth} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Spent this month: ${formatCents(total)}, ${expenses.length} expenses. View summary`}
        onPress={openSummary}
        style={({ pressed }) => [
          styles.totalCard,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <ThemedText type="small" themeColor="textSecondary">
          Spent this month
        </ThemedText>
        <ThemedText style={styles.totalAmount}>{formatCents(total)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {expenses.length === 1 ? '1 expense' : `${expenses.length} expenses`}
        </ThemedText>
        <View style={styles.summaryLink}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            View summary
          </ThemedText>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.tint} />
        </View>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Monthly summary"
              hitSlop={12}
              onPress={openSummary}>
              <MaterialCommunityIcons name="chart-donut" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">{formatDayHeader(section.day)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatCents(section.total)}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <ExpenseRow expense={item} onPress={() => router.push(`/expense/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.empty} />
          ) : error ? (
            <ThemedText style={[styles.empty, { color: theme.danger }]}>{error}</ThemedText>
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={48}
                color={theme.textSecondary}
              />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                No expenses this month yet.{'\n'}Tap + to add one.
              </ThemedText>
            </View>
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        onPress={addExpense}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.tint,
            bottom: insets.bottom + Spacing.four,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <MaterialCommunityIcons name="plus" size={30} color={theme.onTint} />
      </Pressable>

      {deleted ? (
        <Snackbar
          message={`Deleted ${deleted.label}`}
          actionLabel="UNDO"
          onAction={undoDelete}
          onDismiss={dismissSnackbar}
          bottomOffset={insets.bottom + 88}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  totalCard: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
  },
  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  totalAmount: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    marginTop: Spacing.six,
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
