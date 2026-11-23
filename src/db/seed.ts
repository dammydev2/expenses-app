import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { nowTimestamp } from '@/utils/dates';
import { DEFAULT_CURRENCY } from '@/utils/money';

/** Categories created on first launch. Icons are MaterialCommunityIcons names. */
export const DEFAULT_CATEGORIES = [
  // Colours come from the validated chart palette (src/constants/chart-palette.ts).
  // 10 categories > 8 palette hues, so two hues are shared (Shopping/Entertainment,
  // Rent/Subscriptions); the icon tells them apart (hue × shape).
  { name: 'Groceries', icon: 'cart', color: '#2a78d6' }, // blue
  { name: 'Fuel / Car', icon: 'car', color: '#eb6834' }, // orange
  { name: 'Transport', icon: 'bus', color: '#e34948' }, // red
  { name: 'Rent', icon: 'home', color: '#6250d6' }, // violet
  { name: 'Utilities', icon: 'lightning-bolt', color: '#eda100' }, // yellow
  { name: 'Eating out', icon: 'silverware-fork-knife', color: '#1baf7a' }, // aqua
  { name: 'Health', icon: 'medical-bag', color: '#008300' }, // green
  { name: 'Shopping', icon: 'shopping', color: '#e87ba4' }, // magenta
  { name: 'Entertainment', icon: 'movie-open', color: '#e87ba4' }, // magenta (shared)
  { name: 'Subscriptions', icon: 'autorenew', color: '#6250d6' }, // violet (shared)
  { name: 'Other', icon: 'dots-horizontal', color: '#898781' }, // neutral grey
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
