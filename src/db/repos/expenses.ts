import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Expense, ExpenseInput, ExpenseWithCategory } from '@/db/types';
import { isValidISODate, monthRange, nowTimestamp, type YearMonth } from '@/utils/dates';
import { DEFAULT_CURRENCY, MAX_AMOUNT_CENTS } from '@/utils/money';

export const MAX_NOTE_LENGTH = 200;

const SELECT_EXPENSE = `
  SELECT e.id, e.amount_cents AS amountCents, e.currency, e.category_id AS categoryId,
         e.spent_on AS spentOn, e.note, e.created_at AS createdAt, e.updated_at AS updatedAt
  FROM expenses e`;

/** Validates and normalizes input. Throws on invalid data, so bad rows never reach the DB. */
function normalizeInput(input: ExpenseInput): Required<ExpenseInput> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Amount must be a positive whole number of cents.');
  }
  if (input.amountCents > MAX_AMOUNT_CENTS) {
    throw new Error('Amount is too large.');
  }
  if (!isValidISODate(input.spentOn)) {
    throw new Error(`Invalid date: ${input.spentOn}`);
  }
  if (!input.categoryId) {
    throw new Error('Category is required.');
  }
  const note = input.note?.trim().slice(0, MAX_NOTE_LENGTH) || null;
  return { ...input, note };
}

/** All (non-deleted) expenses in a month, newest day first. */
export async function listExpensesForMonth(
  db: SQLiteDatabase,
  month: YearMonth,
): Promise<ExpenseWithCategory[]> {
  const { start, end } = monthRange(month);
  return db.getAllAsync<ExpenseWithCategory>(
    `SELECT e.id, e.amount_cents AS amountCents, e.currency, e.category_id AS categoryId,
            e.spent_on AS spentOn, e.note, e.created_at AS createdAt, e.updated_at AS updatedAt,
            c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL AND e.spent_on >= ? AND e.spent_on < ?
     ORDER BY e.spent_on DESC, e.created_at DESC`,
    start,
    end,
  );
}

export async function getExpense(db: SQLiteDatabase, id: string): Promise<Expense | null> {
  return db.getFirstAsync<Expense>(
    `${SELECT_EXPENSE} WHERE e.id = ? AND e.deleted_at IS NULL`,
    id,
  );
}

/** Category of the most recently added expense, used to preselect it in the form. */
export async function getLastUsedCategoryId(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ categoryId: string }>(
    `SELECT e.category_id AS categoryId
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL AND c.is_archived = 0
     ORDER BY e.created_at DESC
     LIMIT 1`,
  );
  return row?.categoryId ?? null;
}

export async function createExpense(db: SQLiteDatabase, input: ExpenseInput): Promise<string> {
  const data = normalizeInput(input);
  const id = randomUUID();
  const now = nowTimestamp();
  await db.runAsync(
    `INSERT INTO expenses (id, amount_cents, currency, category_id, spent_on, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.amountCents,
    DEFAULT_CURRENCY,
    data.categoryId,
    data.spentOn,
    data.note,
    now,
    now,
  );
  return id;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: string,
  input: ExpenseInput,
): Promise<void> {
  const data = normalizeInput(input);
  const result = await db.runAsync(
    `UPDATE expenses
     SET amount_cents = ?, category_id = ?, spent_on = ?, note = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    data.amountCents,
    data.categoryId,
    data.spentOn,
    data.note,
    nowTimestamp(),
    id,
  );
  if (result.changes === 0) throw new Error('Expense not found.');
}

/** Soft delete: the row stays (for undo and future sync) but is hidden everywhere. */
export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  const now = nowTimestamp();
  await db.runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    now,
    now,
    id,
  );
}

export async function restoreExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE expenses SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    nowTimestamp(),
    id,
  );
}
