import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listExpensesForMonth } from '@/db/repos/expenses';
import type { ExpenseWithCategory } from '@/db/types';
import type { YearMonth } from '@/utils/dates';

/**
 * Loads a month's expenses and reloads whenever the screen regains focus
 * (e.g. after returning from the add/edit screen) or the month changes.
 */
export function useMonthExpenses(month: YearMonth) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const rows = await listExpensesForMonth(db, month);
      setExpenses(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load expenses');
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { expenses, loading, error, reload };
}
