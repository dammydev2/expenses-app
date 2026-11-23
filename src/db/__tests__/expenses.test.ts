import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrateDbIfNeeded } from '@/db/migrations';
import { listActiveCategories, listAllCategories } from '@/db/repos/categories';
import {
  createExpense,
  deleteExpense,
  getExpense,
  getLastUsedCategoryId,
  listExpensesForMonth,
  restoreExpense,
  updateExpense,
} from '@/db/repos/expenses';
import { DEFAULT_CATEGORIES } from '@/db/seed';

import { createTestDb } from '@/test-utils/test-db';

jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

let db: SQLiteDatabase;
let groceries: string;
let fuel: string;

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
  const categories = await listActiveCategories(db);
  groceries = categories.find((c) => c.name === 'Groceries')!.id;
  fuel = categories.find((c) => c.name === 'Fuel / Car')!.id;
});

describe('migrations', () => {
  it('sets the schema version and seeds default categories', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(DATABASE_VERSION);

    const categories = await listAllCategories(db);
    expect(categories.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
    expect(categories.every((c) => c.isArchived === false)).toBe(true);
  });

  it('is idempotent: running again does not re-seed', async () => {
    await migrateDbIfNeeded(db);
    expect(await listAllCategories(db)).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('refuses a database from a newer app version', async () => {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION + 1}`);
    await expect(migrateDbIfNeeded(db)).rejects.toThrow(/newer than this app supports/);
  });
});

describe('expenses repository', () => {
  it('creates and reads an expense', async () => {
    const id = await createExpense(db, {
      amountCents: 6500,
      categoryId: fuel,
      spentOn: '2026-11-23',
      note: '  Shell  ',
    });
    const expense = await getExpense(db, id);
    expect(expense).toMatchObject({
      id,
      amountCents: 6500,
      currency: 'EUR',
      categoryId: fuel,
      spentOn: '2026-11-23',
      note: 'Shell', // trimmed
    });
  });

  it('stores an empty note as null', async () => {
    const id = await createExpense(db, { amountCents: 100, categoryId: fuel, spentOn: '2026-11-01', note: '   ' });
    expect((await getExpense(db, id))?.note).toBeNull();
  });

  it('lists only the requested month, newest day first, with category info', async () => {
    await createExpense(db, { amountCents: 4000, categoryId: groceries, spentOn: '2026-11-01' });
    await createExpense(db, { amountCents: 6500, categoryId: fuel, spentOn: '2026-11-30' });
    await createExpense(db, { amountCents: 999, categoryId: fuel, spentOn: '2026-10-31' }); // previous month
    await createExpense(db, { amountCents: 999, categoryId: fuel, spentOn: '2026-12-01' }); // next month

    const november = await listExpensesForMonth(db, '2026-11');
    expect(november.map((e) => e.spentOn)).toEqual(['2026-11-30', '2026-11-01']);
    expect(november[0]).toMatchObject({ categoryName: 'Fuel / Car', categoryIcon: 'car' });
  });

  it('updates an expense', async () => {
    const id = await createExpense(db, { amountCents: 4000, categoryId: groceries, spentOn: '2026-11-01' });
    await updateExpense(db, id, { amountCents: 4250, categoryId: fuel, spentOn: '2026-11-02', note: 'fixed' });
    expect(await getExpense(db, id)).toMatchObject({
      amountCents: 4250,
      categoryId: fuel,
      spentOn: '2026-11-02',
      note: 'fixed',
    });
  });

  it('soft-deletes and restores', async () => {
    const id = await createExpense(db, { amountCents: 4000, categoryId: groceries, spentOn: '2026-11-01' });

    await deleteExpense(db, id);
    expect(await getExpense(db, id)).toBeNull();
    expect(await listExpensesForMonth(db, '2026-11')).toHaveLength(0);
    await expect(
      updateExpense(db, id, { amountCents: 1, categoryId: fuel, spentOn: '2026-11-01' }),
    ).rejects.toThrow('Expense not found');

    await restoreExpense(db, id);
    expect(await getExpense(db, id)).not.toBeNull();
  });

  it('remembers the last used category', async () => {
    expect(await getLastUsedCategoryId(db)).toBeNull();
    await createExpense(db, { amountCents: 100, categoryId: groceries, spentOn: '2026-11-01' });
    await new Promise((r) => setTimeout(r, 5)); // distinct created_at
    await createExpense(db, { amountCents: 100, categoryId: fuel, spentOn: '2026-10-01' });
    expect(await getLastUsedCategoryId(db)).toBe(fuel);
  });

  it.each([
    [{ amountCents: 0 }, /positive/],
    [{ amountCents: 12.5 }, /positive/],
    [{ amountCents: 1_000_000_000 }, /too large/],
    [{ spentOn: '2026-02-30' }, /Invalid date/],
    [{ categoryId: '' }, /Category is required/],
  ])('rejects invalid input %p', async (override, message) => {
    await expect(
      createExpense(db, { amountCents: 100, categoryId: fuel, spentOn: '2026-11-01', ...override }),
    ).rejects.toThrow(message);
  });

  it('enforces the category foreign key', async () => {
    await expect(
      createExpense(db, { amountCents: 100, categoryId: 'does-not-exist', spentOn: '2026-11-01' }),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
