import { useSyncExternalStore } from 'react';

/**
 * Tiny store for the "Expense deleted · Undo" snackbar.
 * The edit screen records a deletion, then navigates back; the home screen shows the snackbar.
 */
export type DeletedExpense = { id: string; label: string };

let current: DeletedExpense | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const undoDeleteStore = {
  set(value: DeletedExpense | null) {
    current = value;
    emit();
  },
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useDeletedExpense(): DeletedExpense | null {
  return useSyncExternalStore(undoDeleteStore.subscribe, undoDeleteStore.get, undoDeleteStore.get);
}
