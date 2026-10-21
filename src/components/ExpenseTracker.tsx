"use client";

import { useEffect, useMemo, useState } from "react";

import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import {
  buildInsights,
  calculateMonthlyEstimate,
  formatCurrency,
  getCategoryBreakdown,
  getQuietLeak,
  sortExpensesByMonthlyCost,
} from "@/lib/calculations";
import type { Expense, ExpenseFormValues } from "@/types/expense";

const STORAGE_KEY = "where-did-it-go-expenses";
const MAX_EXPENSES = 50;

function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-4xl border border-stone-200 bg-stone-50 p-5 shadow-[0_20px_50px_rgba(28,25,23,0.18)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-stone-500">Investigation</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.06em] text-stone-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-300"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [frequencyPercent, setFrequencyPercent] = useState(100);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Expense[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setExpenses(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, isHydrated]);

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
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(expenses), [expenses]);
  const topCategory = categoryBreakdown[0] ?? null;
  const insights = useMemo(() => buildInsights(expenses), [expenses]);

  const whatIf = useMemo(() => {
    if (!selectedExpense || selectedExpense.frequency === "Once") {
      return null;
    }

    const currentMonthly = calculateMonthlyEstimate(selectedExpense.amount, selectedExpense.frequency);
    const adjustedMonthly = Math.round(currentMonthly * (frequencyPercent / 100));

    return {
      currentMonthly,
      adjustedMonthly,
      monthlySavings: Math.max(0, currentMonthly - adjustedMonthly),
      frequencyPercent,
    };
  }, [frequencyPercent, selectedExpense]);

  const canAddExpense = expenses.length < MAX_EXPENSES;

  const handleSelectExpense = (id: string) => {
    setSelectedExpenseId(id);
    const nextExpense = expenses.find((expense) => expense.id === id);
    if (nextExpense) {
      setFrequencyPercent(100);
    }
  };

  const handleAddExpense = (values: ExpenseFormValues) => {
    if (!canAddExpense) {
      return;
    }

    const nextExpense: Expense = {
      ...values,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    setExpenses((current) => {
      const updated = [nextExpense, ...current];
      setSelectedExpenseId(nextExpense.id);
      setFrequencyPercent(100);
      return updated;
    });
  };

  const handleConfirmRemove = () => {
    if (!pendingRemovalId) {
      return;
    }

    setExpenses((current) => {
      const remaining = current.filter((expense) => expense.id !== pendingRemovalId);

      if (remaining.length === 0) {
        setSelectedExpenseId(null);
        setFrequencyPercent(100);
        setPendingRemovalId(null);
        return remaining;
      }

      const nextSelected =
        remaining.find((expense) => expense.id === selectedExpenseId) ??
        getQuietLeak(remaining) ??
        remaining[0];

      setSelectedExpenseId(nextSelected.id);
      setFrequencyPercent(100);
      setPendingRemovalId(null);

      return remaining;
    });
  };

  const handleClearInvestigation = () => {
    setExpenses([]);
    setSelectedExpenseId(null);
    setFrequencyPercent(100);
    setPendingClear(false);
  };

  const selectedExpenseIsRecurring = selectedExpense ? selectedExpense.frequency !== "Once" : false;

  return (
    <>
      <ConfirmationDialog
        open={Boolean(pendingRemovalId)}
        title="Close this case?"
        message="This expense will be removed from the investigation."
        confirmLabel="Close case"
        cancelLabel="Keep case"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemovalId(null)}
      />

      <ConfirmationDialog
        open={pendingClear}
        title="Start a new investigation?"
        message="This will close all current cases and remove your investigation history from this device."
        confirmLabel="Clear investigation"
        cancelLabel="Cancel"
        onConfirm={handleClearInvestigation}
        onCancel={() => setPendingClear(false)}
      />

      <main
        className="min-h-screen text-stone-900"
        style={{
          background: "radial-gradient(circle at top, #f5f5f4 0%, #f3efe9 38%, #efe7dc 100%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-[2rem] border border-stone-200 bg-stone-50/80 p-5 shadow-[0_18px_50px_rgba(28,25,23,0.06)] backdrop-blur-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.42em] text-stone-500">
                  Where Did It Go?
                </p>
                <div className="mt-3">
                  <h1 className="text-4xl font-semibold tracking-[-0.08em] text-stone-900 sm:text-5xl">
                    Let’s investigate.
                  </h1>
                </div>
              </div>

              {isHydrated && expenses.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPendingClear(true)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:border-stone-300"
                >
                  Start a new investigation
                </button>
              ) : null}
            </div>

            <p className="mt-4 max-w-xl text-sm text-stone-600">
              Enter the habits. We’ll figure out what is quietly eating your month.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-stone-200 bg-white/80 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Monthly damage</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-stone-900">
                  {expenses.length > 0 ? formatCurrency(totalMonthly) : "KSh 0"}
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white/80 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Top leak</p>
                <p className="mt-2 text-lg font-semibold text-stone-900">
                  {quietLeak ? quietLeak.name : "No pattern yet"}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {quietLeak ? formatCurrency(quietLeak.monthlyEstimate) : "Add a few recurring spends"}
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white/80 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Dominant category</p>
                <p className="mt-2 text-lg font-semibold text-stone-900">
                  {topCategory ? topCategory.category : "Awaiting data"}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {topCategory ? `${topCategory.shareOfTotal}% of your spend` : "We’ll spot the pattern soon"}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <ExpenseForm onAdd={handleAddExpense} isLimitReached={!canAddExpense} />

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
                  onRemove={(id) => setPendingRemovalId(id)}
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
                <p className="mt-4 text-4xl font-semibold tracking-[-0.07em]">
                  {expenses.length > 0 ? formatCurrency(totalMonthly) : "No damage logged yet."}
                </p>
                {expenses.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-300">Add a few recurring spends to start the investigation.</p>
                ) : (
                  <p className="mt-2 text-sm text-stone-300">
                    Estimated monthly spend, based on your recurring habits.
                  </p>
                )}
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
                      This is the strongest recurring signal in your spending. It is costing roughly{" "}
                      {formatCurrency(quietLeak.monthlyEstimate)} each month.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-stone-600">
                    Nothing suspicious yet. Give us a few expenses to investigate.
                  </p>
                )}
              </div>

              <div className="rounded-4xl border border-stone-200 bg-stone-50/80 p-5 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-6">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  What if?
                </p>

                {selectedExpense && selectedExpenseIsRecurring ? (
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

                    <label
                      htmlFor="frequency-reduction"
                      className="mt-4 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500"
                    >
                      How often is this really happening?
                    </label>

                    <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-stone-600">Frequency</span>
                        <span className="font-semibold text-stone-900">{frequencyPercent}%</span>
                      </div>

                      <input
                        id="frequency-reduction"
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={frequencyPercent}
                        onChange={(event) => setFrequencyPercent(Number(event.target.value))}
                        className="mt-3 w-full accent-stone-900"
                        aria-label={`Adjust how often ${selectedExpense.name} happens`}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-stone-500">Current monthly</p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.06em] text-stone-900">
                          {formatCurrency(whatIf?.currentMonthly ?? 0)}
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
                      {frequencyPercent}% of the usual pattern could save about {formatCurrency(whatIf?.monthlySavings ?? 0)} this month.
                    </p>
                  </>
                ) : selectedExpense ? (
                  <p className="mt-4 text-sm text-stone-600">
                    This is a one-off cost, so there isn’t a repeating pattern to trim yet.
                  </p>
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
                    No suspects yet. Add your first expense and we’ll start investigating.
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
                  Category breakdown
                </p>

                {categoryBreakdown.length === 0 ? (
                  <p className="mt-4 text-sm text-stone-600">
                    Add a few expenses to see which categories are pulling the most weight.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {categoryBreakdown.slice(0, 4).map((entry) => (
                      <div key={entry.category} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-stone-700">{entry.category}</span>
                          <span className="font-semibold text-stone-900">{formatCurrency(entry.monthlyTotal)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full bg-stone-900"
                            style={{ width: `${Math.max(12, entry.shareOfTotal)}%` }}
                          />
                        </div>
                        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-stone-500">
                          {entry.shareOfTotal}% of your monthly spend
                        </p>
                      </div>
                    ))}
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
    </>
  );
}
