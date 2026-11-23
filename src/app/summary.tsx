import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBreakdown } from '@/components/charts/category-breakdown';
import { DailyBarChart } from '@/components/charts/daily-bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { MonthSwitcher } from '@/components/month-switcher';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMonthReport } from '@/hooks/use-month-report';
import { useTheme } from '@/hooks/use-theme';
import {
  daysElapsed,
  fillDailyTotals,
  foldCategories,
  OTHER_KEY,
} from '@/utils/chart-math';
import { currentMonth, formatLongDate, isValidYearMonth } from '@/utils/dates';
import { formatCents, sumCents } from '@/utils/money';

export default function SummaryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(
    params.month && isValidYearMonth(params.month) && params.month <= currentMonth()
      ? params.month
      : currentMonth(),
  );
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayTable, setShowDayTable] = useState(false);
  const { report, stale, error } = useMonthReport(month);

  const derived = useMemo(() => {
    if (!report) return null;
    const total = sumCents(report.categoryTotals.map((t) => t.totalCents));
    const slices = foldCategories(report.categoryTotals);
    const points = fillDailyTotals(report.month, report.dailyTotals);
    const elapsed = daysElapsed(report.month);
    const biggestDay = points.reduce<(typeof points)[number] | null>(
      (best, p) => (p.totalCents > (best?.totalCents ?? 0) ? p : best),
      null,
    );
    return { total, slices, points, elapsed, biggestDay };
  }, [report]);

  function changeMonth(next: string) {
    setMonth(next);
    setSelectedSlice(null);
    setSelectedDay(null);
  }

  /** Selecting a row selects its donut slice, or "Other" if it was folded in. */
  function selectCategory(categoryId: string) {
    if (!derived) return;
    const sliceKey = derived.slices.some((s) => s.key === categoryId) ? categoryId : OTHER_KEY;
    setSelectedSlice((current) => (current === sliceKey ? null : sliceKey));
  }

  if (!report || !derived) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: theme.background }]}>
        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const { total, slices, points, elapsed, biggestDay } = derived;
  const selectedPoint = selectedDay !== null ? points[selectedDay] : null;
  const readoutPoint = selectedPoint ?? biggestDay;
  const selectedCategoryId =
    selectedSlice && selectedSlice !== OTHER_KEY ? selectedSlice : null;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
      <MonthSwitcher month={month} onChange={changeMonth} />

      <View style={{ opacity: stale ? 0.5 : 1, gap: Spacing.four }}>
        {/* Hero + KPIs */}
        <View style={styles.hero}>
          <ThemedText type="small" themeColor="textSecondary">
            Spent
          </ThemedText>
          <ThemedText style={styles.heroValue}>{formatCents(total)}</ThemedText>
        </View>

        {total === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chart-donut" size={48} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              No spending recorded for this month.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.kpiRow}>
              <Kpi
                label="Daily average"
                value={elapsed > 0 ? formatCents(Math.round(total / elapsed)) : '—'}
                detail={`over ${elapsed} ${elapsed === 1 ? 'day' : 'days'}`}
              />
              <Kpi
                label="Biggest day"
                value={biggestDay ? formatCents(biggestDay.totalCents) : '—'}
                detail={biggestDay ? formatLongDate(biggestDay.day) : ''}
              />
            </View>

            {/* Where it went */}
            <Section title="Where it went">
              <DonutChart
                slices={slices}
                totalCents={total}
                selectedKey={selectedSlice}
                onSelect={setSelectedSlice}
              />
              {slices.some((s) => s.isOther) ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Smaller categories are grouped as “Other”.
                </ThemedText>
              ) : null}
              <CategoryBreakdown
                totals={report.categoryTotals}
                totalCents={total}
                selectedId={selectedCategoryId}
                onSelect={selectCategory}
              />
            </Section>

            {/* By day */}
            <Section
              title="Spending by day"
              action={
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setShowDayTable((v) => !v)}>
                  <ThemedText type="smallBold" style={{ color: theme.tint }}>
                    {showDayTable ? 'Show chart' : 'Show table'}
                  </ThemedText>
                </Pressable>
              }>
              {showDayTable ? (
                <DayTable points={points} />
              ) : (
                <>
                  <View style={styles.readout}>
                    {readoutPoint && readoutPoint.totalCents > 0 ? (
                      <>
                        <ThemedText style={styles.readoutValue}>
                          {formatCents(readoutPoint.totalCents)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {selectedPoint ? '' : 'Highest · '}
                          {formatLongDate(readoutPoint.day)} · {readoutPoint.count}{' '}
                          {readoutPoint.count === 1 ? 'expense' : 'expenses'}
                        </ThemedText>
                      </>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        {selectedPoint ? `${formatLongDate(selectedPoint.day)} · no spending` : ' '}
                      </ThemedText>
                    )}
                  </View>
                  <DailyBarChart
                    points={points}
                    selectedIndex={selectedDay}
                    onSelect={setSelectedDay}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                    Tap or drag across the chart to see a day.
                  </ThemedText>
                </>
              )}
            </Section>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.kpiValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {detail}
      </ThemedText>
    </View>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

/** Table view of the daily chart: every day with spending. */
function DayTable({ points }: { points: ReturnType<typeof fillDailyTotals> }) {
  const theme = useTheme();
  const days = points.filter((p) => p.totalCents > 0);
  return (
    <View>
      {days.map((p) => (
        <View key={p.day} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
          <ThemedText style={styles.flex}>{formatLongDate(p.day)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tableCount}>
            {p.count}×
          </ThemedText>
          <ThemedText style={styles.tableAmount}>{formatCents(p.totalCents)}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  hero: {
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 700,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  kpi: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: 2,
  },
  kpiValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  readout: {
    minHeight: 48,
  },
  readoutValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
  },
  centerText: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCount: {
    fontVariant: ['tabular-nums'],
  },
  tableAmount: {
    minWidth: 88,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
