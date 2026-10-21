import type { Category, Expense, Frequency } from "@/types/expense";

const monthlyMultiplier: Record<Frequency, number> = {
  Once: 1,
  Daily: 30,
  Weekly: 4,
  Monthly: 1,
};

export interface QuietLeak extends Expense {
  monthlyEstimate: number;
}

export interface WhatIfOutcome {
  currentMonthly: number;
  adjustedMonthly: number;
  monthlySavings: number;
  amountReduction: number;
}

export interface CategoryBreakdownEntry {
  category: Category;
  monthlyTotal: number;
  shareOfTotal: number;
}

function compactNumber(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    const millions = absolute / 1_000_000;
    const digits = millions >= 10 ? 1 : 2;
    return `${millions.toLocaleString("en-KE", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    })}M`;
  }

  return value.toLocaleString("en-KE");
}

export function calculateMonthlyEstimate(amount: number, frequency: Expense["frequency"]) {
  return Math.round(amount * monthlyMultiplier[frequency]);
}

export function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const absolute = Math.abs(safeValue);

  if (absolute >= 1_000_000) {
    return `KSh ${compactNumber(safeValue)}`;
  }

  return `KSh ${safeValue.toLocaleString("en-KE")}`;
}

export function sortExpensesByMonthlyCost(expenses: Expense[]) {
  return [...expenses].sort(
    (left, right) =>
      calculateMonthlyEstimate(right.amount, right.frequency) -
      calculateMonthlyEstimate(left.amount, left.frequency),
  );
}

export function getQuietLeak(expenses: Expense[]): QuietLeak | null {
  if (expenses.length === 0) {
    return null;
  }

  const quietLeak = sortExpensesByMonthlyCost(expenses)[0];

  return {
    ...quietLeak,
    monthlyEstimate: calculateMonthlyEstimate(quietLeak.amount, quietLeak.frequency),
  };
}

export function getWhatIfSavings(expense: Expense, adjustedAmount: number): WhatIfOutcome {
  const safeAdjustedAmount = Math.max(0, adjustedAmount);
  const currentMonthly = calculateMonthlyEstimate(expense.amount, expense.frequency);
  const adjustedMonthly = calculateMonthlyEstimate(safeAdjustedAmount, expense.frequency);

  return {
    currentMonthly,
    adjustedMonthly,
    monthlySavings: Math.max(0, currentMonthly - adjustedMonthly),
    amountReduction: Math.max(0, expense.amount - safeAdjustedAmount),
  };
}

export function updateExpense(
  expenses: Expense[],
  id: string,
  updates: Partial<Expense>,
): Expense[] {
  return expenses.map((expense) =>
    expense.id === id ? { ...expense, ...updates, id } : expense,
  );
}

export function getCategoryBreakdown(expenses: Expense[]): CategoryBreakdownEntry[] {
  if (expenses.length === 0) {
    return [];
  }

  const totalMonthly = expenses.reduce(
    (total, expense) => total + calculateMonthlyEstimate(expense.amount, expense.frequency),
    0,
  );

  const categoryTotals = expenses.reduce<Record<Category, number>>(
    (totals, expense) => {
      const key = expense.category;
      totals[key] = (totals[key] ?? 0) + calculateMonthlyEstimate(expense.amount, expense.frequency);
      return totals;
    },
    {
      Food: 0,
      Transport: 0,
      Shopping: 0,
      Entertainment: 0,
      Subscriptions: 0,
      Bills: 0,
      Other: 0,
    },
  );

  return (Object.entries(categoryTotals) as [Category, number][])
    .map(([category, monthlyTotal]) => ({
      category,
      monthlyTotal,
      shareOfTotal: totalMonthly === 0 ? 0 : Math.round((monthlyTotal / totalMonthly) * 100),
    }))
    .filter((entry) => entry.monthlyTotal > 0)
    .sort((left, right) => right.monthlyTotal - left.monthlyTotal);
}

export function buildInsights(expenses: Expense[]) {
  if (expenses.length === 0) {
    return [
      "Nothing suspicious yet.",
      "Add your first expense and we’ll start investigating.",
    ];
  }

  const quietLeak = getQuietLeak(expenses);
  const totalMonthly = expenses.reduce(
    (total, expense) => total + calculateMonthlyEstimate(expense.amount, expense.frequency),
    0,
  );

  const categoryBreakdown = getCategoryBreakdown(expenses);
  const dominantCategory = categoryBreakdown[0] ?? null;

  const averageExpense =
    Math.round(
      expenses.reduce((total, expense) => total + expense.amount, 0) / expenses.length,
    ) || 0;

  const quietLeakShare = quietLeak ? Math.round((quietLeak.monthlyEstimate / totalMonthly) * 100) : 0;

  const firstInsight = quietLeak
    ? `The quiet leak is ${quietLeak.name}. At ${formatCurrency(quietLeak.amount)} each ${quietLeak.frequency.toLowerCase()}, it is costing about ${formatCurrency(quietLeak.monthlyEstimate)} a month — roughly ${quietLeakShare}% of your total.`
    : "Your spending is still spread out, so there is no single loud culprit yet.";

  const secondInsight = dominantCategory
    ? `${dominantCategory.category} is your strongest signal right now, adding roughly ${formatCurrency(dominantCategory.monthlyTotal)} to the monthly damage.`
    : "Your spending is still spread out, so there is no dominant category yet.";

  const thirdInsight = quietLeak
    ? `A small cut of ${formatCurrency(Math.max(50, Math.round(averageExpense / 2)))} on ${quietLeak.name.toLowerCase()} could save roughly ${formatCurrency(Math.max(400, Math.round(quietLeak.monthlyEstimate * 0.25)))} this month.`
    : `Cutting just ${formatCurrency(Math.max(20, Math.round(averageExpense / 3)))} from a regular habit could save roughly ${formatCurrency(Math.max(300, Math.round((averageExpense / 3) * 8)))} this month.`;

  return [firstInsight, secondInsight, thirdInsight];
}
