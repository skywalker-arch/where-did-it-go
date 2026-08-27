"use client";

import { useEffect, useMemo, useState } from "react";

import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import {
  buildInsights,
  calculateMonthlyEstimate,
  formatCurrency,
  getQuietLeak,
  getWhatIfSavings,
  sortExpensesByMonthlyCost,
} from "@/lib/calculations";
import type { Expense, ExpenseFormValues } from "@/types/expense";

const STORAGE_KEY = "where-did-it-go-expenses";

export function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved) as Expense[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses]);

  const quietLeak = useMemo(() => getQuietLeak(expenses), [expenses]);

  const selectedExpense = useMemo(() => {
    if (expenses.length === 0) {
      return null;
    }

    const activeId =
      selectedExpenseId && expenses.some((expense) => expense.id === selectedExpenseId)
        ? selectedExpenseId
        : quietLeak?.id ?? expenses[0].id;

    return expenses.find((expense) => expense.id === activeId) ?? quietLeak ?? null;
  }, [expenses, quietLeak, selectedExpenseId]);

  const totalMonthly = useMemo(
    () =>
      expenses.reduce(
        (total, expense) => total + calculateMonthlyEstimate(expense.amount, expense.frequency),
        0,
      ),
    [expenses],
  );

  const suspects = useMemo(() => sortExpensesByMonthlyCost(expenses).slice(0, 3), [expenses]);
  const insights = useMemo(() => buildInsights(expenses), [expenses]);
  const whatIf =
    selectedExpense && adjustedAmount >= 0
      ? getWhatIfSavings(selectedExpense, adjustedAmount)
      : null;

  const handleSelectExpense = (id: string) => {
    setSelectedExpenseId(id);

    const nextExpense = expenses.find((expense) => expense.id === id);
    if (nextExpense) {
      setAdjustedAmount(nextExpense.amount);
    }
  };

  const handleAddExpense = (values: ExpenseFormValues) => {
    const nextExpense: Expense = {
      ...values,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    setExpenses((current) => {
      const updated = [nextExpense, ...current];
      setSelectedExpenseId(nextExpense.id);
      setAdjustedAmount(nextExpense.amount);
      return updated;
    });
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((current) => {
      const remaining = current.filter((expense) => expense.id !== id);

      if (remaining.length === 0) {
        setSelectedExpenseId(null);
        setAdjustedAmount(0);
        return remaining;
      }

      const nextSelected = remaining.find((expense) => expense.id === selectedExpenseId) ?? getQuietLeak(remaining) ?? remaining[0];

      setSelectedExpenseId(nextSelected.id);
      setAdjustedAmount(nextSelected.amount);

      return remaining;
    });
  };

  return (
    <main
      className="min-h-screen text-stone-900"
      style={{
        background: "radial-gradient(circle at top, #f5f5f4 0%, #f3efe9 38%, #efe7dc 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] backdrop-blur-sm sm:p-7">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.42em] text-stone-500">
            Where Did It Go?
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-4xl font-semibold tracking-[-0.08em] text-stone-900 sm:text-5xl">
              Let’s investigate.
            </h1>
            <p className="max-w-md text-sm text-stone-600">
              Enter the habits. We’ll figure out what is quietly eating your month.
            </p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <ExpenseForm onAdd={handleAddExpense} />

            <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-4 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-stone-500">
                    The case files
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.06em] text-stone-900">
                    Your expenses
                  </h2>
                </div>
                <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-stone-500">
                  {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              <ExpenseList
                expenses={expenses}
                onRemove={handleRemoveExpense}
                onSelect={handleSelectExpense}
                selectedExpenseId={selectedExpense?.id ?? null}
              />
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-4xl border border-stone-200 bg-stone-900 p-5 text-stone-50 shadow-[0_20px_50px_rgba(28,25,23,0.12)] sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-300">
                The damage
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-[-0.07em]">{formatCurrency(totalMonthly)}</p>
              <p className="mt-2 text-sm text-stone-300">
                Estimated monthly spend, based on your recurring habits.
              </p>
            </div>

            <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                The quiet leak
              </p>

              {quietLeak ? (
                <>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-stone-900">{quietLeak.name}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">
                        {quietLeak.category}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-[-0.06em] text-stone-900">
                      {formatCurrency(quietLeak.monthlyEstimate)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    This is the strongest recurring signal in your spending. It is costing roughly{
                      " "
                    }
                    {formatCurrency(quietLeak.monthlyEstimate)} each month.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  Nothing is leaking yet. Add a few regular spends and we’ll spot the pattern.
                </p>
              )}
            </div>

            <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                What if?
              </p>

              {selectedExpense ? (
                <>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-stone-900">{selectedExpense.name}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">
                        {selectedExpense.frequency}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(selectedExpense.amount)}</p>
                  </div>

                  <label htmlFor="what-if-amount" className="mt-4 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    Adjust the amount
                  </label>
                  <div className="mt-2 flex items-center rounded-2xl border border-stone-200 bg-white px-3 py-3 focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-200">
                    <span className="mr-2 text-sm font-medium text-stone-500">KSh</span>
                    <input
                      id="what-if-amount"
                      type="number"
                      min="0"
                      step="10"
                      value={adjustedAmount || ""}
                      onChange={(event) => setAdjustedAmount(Number(event.target.value) || 0)}
                      className="w-full bg-transparent text-base text-stone-900 outline-none"
                    />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(selectedExpense.amount * 2, 500)}
                    step={10}
                    value={adjustedAmount}
                    onChange={(event) => setAdjustedAmount(Number(event.target.value))}
                    className="mt-3 w-full accent-stone-900"
                    aria-label={`Adjust the amount for ${selectedExpense.name}`}
                  />

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">Monthly saving</p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.06em] text-stone-900">
                        {formatCurrency(whatIf?.monthlySavings ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">New monthly</p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.06em] text-stone-900">
                        {formatCurrency(whatIf?.adjustedMonthly ?? 0)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-stone-600">
                    Lowering it by {formatCurrency(whatIf?.amountReduction ?? 0)} would reduce this habit by {formatCurrency(whatIf?.monthlySavings ?? 0)} a month.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  Add a recurring expense to model a realistic cut.
                </p>
              )}
            </div>

            <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                The suspects
              </p>

              {suspects.length === 0 ? (
                <p className="mt-4 text-sm text-stone-600">
                  No suspects yet. Add a few expenses and we’ll start ranking the biggest drains.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {suspects.map((expense, index) => {
                    const estimate = calculateMonthlyEstimate(expense.amount, expense.frequency);
                    const isSelected = selectedExpenseId === expense.id;

                    return (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() => handleSelectExpense(expense.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition active:translate-y-px ${
                          isSelected
                            ? "border-stone-900 bg-stone-900 text-stone-50"
                            : "border-stone-200 bg-white text-stone-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{index + 1}. {expense.name}</p>
                            <p
                              className={`mt-1 text-[0.68rem] uppercase tracking-[0.18em] ${
                                isSelected ? "text-stone-300" : "text-stone-500"
                              }`}
                            >
                              {expense.category}
                            </p>
                          </div>
                          <p className="text-base font-semibold">{formatCurrency(estimate)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                We found something
              </p>

              <div className="mt-4 space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={`${insight}-${index}`}
                    className="rounded-2xl border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700"
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
