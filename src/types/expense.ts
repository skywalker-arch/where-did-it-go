export const CATEGORY_OPTIONS = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Subscriptions",
  "Bills",
  "Other",
] as const;

export const FREQUENCY_OPTIONS = ["Once", "Daily", "Weekly", "Monthly"] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];
export type Frequency = (typeof FREQUENCY_OPTIONS)[number];

export interface ExpenseFormValues {
  name: string;
  amount: number;
  category: Category;
  frequency: Frequency;
}

export interface Expense extends ExpenseFormValues {
  id: string;
  createdAt: string;
}
