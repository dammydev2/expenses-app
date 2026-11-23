import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category } from '@/db/types';

type CategoryRow = Omit<Category, 'isArchived'> & { isArchived: number };

const SELECT_CATEGORY = `
  SELECT id, name, icon, color, sort_order AS sortOrder, is_archived AS isArchived
  FROM categories`;

const toCategory = (row: CategoryRow): Category => ({ ...row, isArchived: row.isArchived === 1 });

/** Categories the user can pick when adding an expense. */
export async function listActiveCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    `${SELECT_CATEGORY} WHERE is_archived = 0 ORDER BY sort_order, name`,
  );
  return rows.map(toCategory);
}

/** Every category, including archived ones (old expenses may still use them). */
export async function listAllCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(`${SELECT_CATEGORY} ORDER BY sort_order, name`);
  return rows.map(toCategory);
}
