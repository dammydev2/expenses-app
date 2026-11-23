import type { ISODate } from '@/utils/dates';

export type Category = {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons name
  color: string; // hex
  sortOrder: number;
  isArchived: boolean;
};

export type Expense = {
  id: string;
  amountCents: number;
  currency: string;
  categoryId: string;
  spentOn: ISODate;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Expense joined with the display fields of its category (for lists). */
export type ExpenseWithCategory = Expense & {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
};

/** Fields the user can set when creating or editing an expense. */
export type ExpenseInput = {
  amountCents: number;
  categoryId: string;
  spentOn: ISODate;
  note?: string | null;
};
