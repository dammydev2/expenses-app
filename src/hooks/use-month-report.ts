import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  categoryTotalsForMonth,
  dailyTotalsForMonth,
  type CategoryTotal,
  type DailyTotal,
} from '@/db/repos/reports';
import type { YearMonth } from '@/utils/dates';

type Report = { month: YearMonth; categoryTotals: CategoryTotal[]; dailyTotals: DailyTotal[] };

/**
 * Loads the aggregates for a month's summary. Reloads on focus and when the month changes.
 * While a new month loads, the previous report stays on screen (`stale` = true) instead of
 * flashing a spinner, so the layout never jumps.
 */
export function useMonthReport(month: YearMonth) {
  const db = useSQLiteContext();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [categoryTotals, dailyTotals] = await Promise.all([
        categoryTotalsForMonth(db, month),
        dailyTotalsForMonth(db, month),
      ]);
      setReport({ month, categoryTotals, dailyTotals });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the summary');
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { report, stale: report !== null && report.month !== month, error };
}
