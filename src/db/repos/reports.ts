import type { SQLiteDatabase } from 'expo-sqlite';

import { monthRange, type ISODate, type YearMonth } from '@/utils/dates';

export type CategoryTotal = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  totalCents: number;
  count: number;
};

export type DailyTotal = {
  day: ISODate;
  totalCents: number;
  count: number;
};

/** Spending per category for a month, largest first. Categories with no spending are omitted. */
export async function categoryTotalsForMonth(
  db: SQLiteDatabase,
  month: YearMonth,
): Promise<CategoryTotal[]> {
  const { start, end } = monthRange(month);
  return db.getAllAsync<CategoryTotal>(
    `SELECT c.id AS categoryId, c.name, c.icon, c.color,
            SUM(e.amount_cents) AS totalCents, COUNT(*) AS count
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL AND e.spent_on >= ? AND e.spent_on < ?
     GROUP BY c.id
     ORDER BY totalCents DESC, c.sort_order`,
    start,
    end,
  );
}

/** Spending per day for a month (only days that have expenses), in date order. */
export async function dailyTotalsForMonth(
  db: SQLiteDatabase,
  month: YearMonth,
): Promise<DailyTotal[]> {
  const { start, end } = monthRange(month);
  return db.getAllAsync<DailyTotal>(
    `SELECT spent_on AS day, SUM(amount_cents) AS totalCents, COUNT(*) AS count
     FROM expenses
     WHERE deleted_at IS NULL AND spent_on >= ? AND spent_on < ?
     GROUP BY spent_on
     ORDER BY spent_on`,
    start,
    end,
  );
}
