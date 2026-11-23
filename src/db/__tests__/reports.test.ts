import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrateDbIfNeeded, migrations } from '@/db/migrations';
import { listActiveCategories } from '@/db/repos/categories';
import { createExpense, deleteExpense } from '@/db/repos/expenses';
import { categoryTotalsForMonth, dailyTotalsForMonth } from '@/db/repos/reports';
import { createTestDb } from '@/test-utils/test-db';

jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

let db: SQLiteDatabase;
let ids: Record<string, string>;

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
  const categories = await listActiveCategories(db);
  ids = Object.fromEntries(categories.map((c) => [c.name, c.id]));
});

describe('report queries', () => {
  beforeEach(async () => {
    await createExpense(db, { amountCents: 4000, categoryId: ids['Groceries'], spentOn: '2026-11-01' });
    await createExpense(db, { amountCents: 2550, categoryId: ids['Groceries'], spentOn: '2026-11-03' });
    await createExpense(db, { amountCents: 6500, categoryId: ids['Fuel / Car'], spentOn: '2026-11-03' });
    await createExpense(db, { amountCents: 1200, categoryId: ids['Health'], spentOn: '2026-11-30' });
    // Excluded: other months and deleted rows.
    await createExpense(db, { amountCents: 9999, categoryId: ids['Rent'], spentOn: '2026-10-31' });
    await createExpense(db, { amountCents: 9999, categoryId: ids['Rent'], spentOn: '2026-12-01' });
    const deleted = await createExpense(db, { amountCents: 9999, categoryId: ids['Rent'], spentOn: '2026-11-15' });
    await deleteExpense(db, deleted);
  });

  it('totals per category, largest first', async () => {
    const totals = await categoryTotalsForMonth(db, '2026-11');
    expect(totals.map((t) => [t.name, t.totalCents, t.count])).toEqual([
      ['Groceries', 6550, 2],
      ['Fuel / Car', 6500, 1],
      ['Health', 1200, 1],
    ]);
    expect(totals[0]).toMatchObject({ icon: 'cart', color: '#2a78d6' });
  });

  it('totals per day, in date order', async () => {
    expect(await dailyTotalsForMonth(db, '2026-11')).toEqual([
      { day: '2026-11-01', totalCents: 4000, count: 1 },
      { day: '2026-11-03', totalCents: 9050, count: 2 },
      { day: '2026-11-30', totalCents: 1200, count: 1 },
    ]);
  });

  it('returns empty results for a month without spending', async () => {
    expect(await categoryTotalsForMonth(db, '2026-09')).toEqual([]);
    expect(await dailyTotalsForMonth(db, '2026-09')).toEqual([]);
  });
});

describe('migration v2 (palette recolour)', () => {
  it('upgrades a v1 database, keeping colours the user changed', async () => {
    const v1 = createTestDb();
    await v1.execAsync('PRAGMA foreign_keys = ON;');
    await v1.withTransactionAsync(async () => {
      await migrations[0](v1);
      await v1.execAsync('PRAGMA user_version = 1');
    });
    // Simulate v1 data: the original v1 seed colours, and one colour the user customised.
    const v1Colors: Record<string, string> = { Groceries: '#2E9E5B', Rent: '#7048E8' };
    for (const [name, color] of Object.entries(v1Colors)) {
      await v1.runAsync('UPDATE categories SET color = ? WHERE name = ?', color, name);
    }
    await v1.runAsync("UPDATE categories SET color = '#123456' WHERE name = 'Health'");

    await migrateDbIfNeeded(v1);

    const row = await v1.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(DATABASE_VERSION);
    const colors = Object.fromEntries(
      (await listActiveCategories(v1)).map((c) => [c.name, c.color]),
    );
    expect(colors['Groceries']).toBe('#2a78d6');
    expect(colors['Rent']).toBe('#6250d6');
    expect(colors['Health']).toBe('#123456'); // user's choice untouched
  });
});
