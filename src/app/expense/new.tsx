import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ExpenseForm, type ExpenseFormValues } from '@/components/expense-form';
import { listActiveCategories } from '@/db/repos/categories';
import { createExpense, getLastUsedCategoryId } from '@/db/repos/expenses';
import type { Category, ExpenseInput } from '@/db/types';
import { isValidISODate, todayISO } from '@/utils/dates';

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ date?: string }>();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [initialValues, setInitialValues] = useState<ExpenseFormValues | null>(null);

  useEffect(() => {
    (async () => {
      const [cats, lastCategoryId] = await Promise.all([
        listActiveCategories(db),
        getLastUsedCategoryId(db),
      ]);
      const date = params.date && isValidISODate(params.date) && params.date <= todayISO()
        ? params.date
        : todayISO();
      setCategories(cats);
      setInitialValues({ categoryId: lastCategoryId ?? cats[0]?.id ?? null, spentOn: date });
    })();
  }, [db, params.date]);

  async function handleSubmit(input: ExpenseInput) {
    await createExpense(db, input);
    router.back();
  }

  if (!categories || !initialValues) return <ActivityIndicator style={styles.loading} />;

  return (
    <ExpenseForm
      categories={categories}
      initialValues={initialValues}
      submitLabel="Add expense"
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 64,
  },
});
