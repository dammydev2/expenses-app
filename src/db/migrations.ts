import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaults } from '@/db/seed';

/**
 * Versioned schema migrations.
 *
 * The database stores its schema version in `PRAGMA user_version`.
 * Migration N (array index N-1) upgrades the schema from version N-1 to N.
 *
 * RULES
 *  - Never edit or reorder a migration that has shipped: real data depends on it.
 *    To change the schema, APPEND a new migration.
 *  - Never drop user data. Add columns / tables, or copy data into a new table.
 */
type Migration = (db: SQLiteDatabase) => Promise<void>;

export const migrations: Migration[] = [
  // v1: initial schema
  async (db) => {
    await db.execAsync(`
      CREATE TABLE categories (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL,
        color       TEXT NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE expenses (
        id           TEXT PRIMARY KEY NOT NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        currency     TEXT NOT NULL DEFAULT 'EUR',
        category_id  TEXT NOT NULL REFERENCES categories(id),
        spent_on     TEXT NOT NULL,
        note         TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        deleted_at   TEXT
      );
      CREATE INDEX idx_expenses_spent_on ON expenses(spent_on);
      CREATE INDEX idx_expenses_category ON expenses(category_id);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await seedDefaults(db);
  },

  // v2: move default categories onto the validated colour-blind-safe chart palette.
  // Only recolours a category whose colour is still the original v1 default,
  // so a colour the user chose themselves is never overwritten.
  async (db) => {
    const recolor: [name: string, v1Color: string, newColor: string][] = [
      ['Groceries', '#2E9E5B', '#2a78d6'],
      ['Fuel / Car', '#E8590C', '#eb6834'],
      ['Transport', '#1C7ED6', '#e34948'],
      ['Rent', '#7048E8', '#6250d6'],
      ['Utilities', '#F59F00', '#eda100'],
      ['Eating out', '#D6336C', '#1baf7a'],
      ['Health', '#0CA678', '#008300'],
      ['Shopping', '#AE3EC9', '#e87ba4'],
      ['Entertainment', '#4263EB', '#e87ba4'],
      ['Subscriptions', '#1098AD', '#6250d6'],
      ['Other', '#868E96', '#898781'],
    ];
    const now = new Date().toISOString();
    for (const [name, v1Color, newColor] of recolor) {
      await db.runAsync(
        'UPDATE categories SET color = ?, updated_at = ? WHERE name = ? AND color = ?',
        newColor,
        now,
        name,
        v1Color,
      );
    }
  },
];

export const DATABASE_VERSION = migrations.length;

/** Passed to <SQLiteProvider onInit>. Runs before any screen renders. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Connection-level settings (must be set outside a transaction).
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than this app supports (${DATABASE_VERSION}).`,
    );
  }

  // Each migration and its version bump commit together, or not at all.
  for (let version = currentVersion; version < DATABASE_VERSION; version++) {
    const migrate = migrations[version];
    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
