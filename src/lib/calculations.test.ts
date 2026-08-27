import test from "node:test";
import assert from "node:assert/strict";

import type { Expense } from "@/types/expense";
import { getQuietLeak, getWhatIfSavings } from "./calculations.ts";

const sampleExpenses: Expense[] = [
  { id: "1", name: "Coffee", amount: 150, category: "Food", frequency: "Daily", createdAt: "2024-01-01" },
  { id: "2", name: "Bus fare", amount: 70, category: "Transport", frequency: "Daily", createdAt: "2024-01-01" },
  { id: "3", name: "Streaming", amount: 450, category: "Subscriptions", frequency: "Monthly", createdAt: "2024-01-01" },
];

test("getQuietLeak picks the highest monthly recurring expense", () => {
  const quietLeak = getQuietLeak(sampleExpenses);

  assert.equal(quietLeak?.name, "Coffee");
  assert.equal(quietLeak?.monthlyEstimate, 4500);
});

test("getWhatIfSavings calculates the monthly impact of lowering a repeat spend", () => {
  const result = getWhatIfSavings(sampleExpenses[0], 100);

  assert.equal(result.currentMonthly, 4500);
  assert.equal(result.adjustedMonthly, 3000);
  assert.equal(result.monthlySavings, 1500);
  assert.equal(result.amountReduction, 50);
});
