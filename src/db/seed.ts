import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { nowTimestamp } from '@/utils/dates';
import { DEFAULT_CURRENCY } from '@/utils/money';

/** Categories created on first launch. Icons are MaterialCommunityIcons names. */
export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: 'cart', color: '#2E9E5B' },
  { name: 'Fuel / Car', icon: 'car', color: '#E8590C' },
  { name: 'Transport', icon: 'bus', color: '#1C7ED6' },
  { name: 'Rent', icon: 'home', color: '#7048E8' },
  { name: 'Utilities', icon: 'lightning-bolt', color: '#F59F00' },
  { name: 'Eating out', icon: 'silverware-fork-knife', color: '#D6336C' },
  { name: 'Health', icon: 'medical-bag', color: '#0CA678' },
  { name: 'Shopping', icon: 'shopping', color: '#AE3EC9' },
  { name: 'Entertainment', icon: 'movie-open', color: '#4263EB' },
  { name: 'Subscriptions', icon: 'autorenew', color: '#1098AD' },
  { name: 'Other', icon: 'dots-horizontal', color: '#868E96' },
] as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  currency: DEFAULT_CURRENCY,
};

export async function seedDefaults(db: SQLiteDatabase): Promise<void> {
  const now = nowTimestamp();

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, sort_order, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      randomUUID(),
      category.name,
      category.icon,
      category.color,
      index,
      now,
      now,
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', key, value);
  }
}
