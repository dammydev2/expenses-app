/**
 * Test helper: an in-memory SQLite database (Node's built-in `node:sqlite`)
 * wrapped in the subset of the expo-sqlite `SQLiteDatabase` API our code uses.
 * Lets repository + migration tests run real SQL without a device.
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type Params = SQLInputValue[];

function flatten(params: unknown[]): Params {
  return (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as Params;
}

export function createTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');

  const db = {
    async execAsync(source: string) {
      raw.exec(source);
    },
    async runAsync(source: string, ...params: unknown[]) {
      const result = raw.prepare(source).run(...flatten(params));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, ...params: unknown[]) {
      return (raw.prepare(source).get(...flatten(params)) ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, ...params: unknown[]) {
      return raw.prepare(source).all(...flatten(params)) as T[];
    },
    async withTransactionAsync(task: () => Promise<void>) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };

  return db as unknown as SQLiteDatabase;
}
