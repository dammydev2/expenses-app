import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ExpenseForm } from '@/components/expense-form';
import { ThemedText } from '@/components/themed-text';
import { listAllCategories } from '@/db/repos/categories';
import { deleteExpense, getExpense, updateExpense } from '@/db/repos/expenses';
import type { Category, Expense, ExpenseInput } from '@/db/types';
import { undoDeleteStore } from '@/stores/undo-delete';
import { formatCents } from '@/utils/money';

type State =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'ready'; expense: Expense; categories: Category[] };

export default function EditExpenseScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      const [expense, allCategories] = await Promise.all([
        getExpense(db, id),
        listAllCategories(db),
      ]);
      if (!expense) {
        setState({ status: 'not-found' });
        return;
      }
      // Show active categories, plus this expense's category even if it was archived since.
      const categories = allCategories.filter(
        (c) => !c.isArchived || c.id === expense.categoryId,
      );
      setState({ status: 'ready', expense, categories });
    })();
  }, [db, id]);

  if (state.status === 'loading') return <ActivityIndicator style={styles.message} />;
  if (state.status === 'not-found') {
    return (
      <ThemedText themeColor="textSecondary" style={styles.message}>
        This expense no longer exists.
      </ThemedText>
    );
  }

  const { expense, categories } = state;

  async function handleSubmit(input: ExpenseInput) {
    await updateExpense(db, expense.id, input);
    router.back();
  }

  async function handleDelete() {
    await deleteExpense(db, expense.id);
    const categoryName = categories.find((c) => c.id === expense.categoryId)?.name ?? 'expense';
    undoDeleteStore.set({
      id: expense.id,
      label: `${formatCents(expense.amountCents, expense.currency)} · ${categoryName}`,
    });
    router.back();
  }

  return (
    <ExpenseForm
      categories={categories}
      initialValues={expense}
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}

const styles = StyleSheet.create({
  message: {
    marginTop: 64,
    textAlign: 'center',
  },
});
