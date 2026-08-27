import { calculateMonthlyEstimate, formatCurrency } from "@/lib/calculations";
import type { Expense } from "@/types/expense";

interface ExpenseListProps {
  expenses: Expense[];
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedExpenseId?: string | null;
}

export function ExpenseList({
  expenses,
  onRemove,
  onSelect,
  selectedExpenseId,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-4xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
        <p className="text-2xl font-semibold tracking-[-0.06em] text-stone-900">Nothing suspicious yet.</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Add your first expense and we’ll start investigating.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list">
      {expenses.map((expense) => {
        const monthlyEstimate = calculateMonthlyEstimate(expense.amount, expense.frequency);
        const isSelected = selectedExpenseId === expense.id;

        return (
          <div
            key={expense.id}
            role="listitem"
            className={`flex items-start justify-between gap-4 rounded-3xl border p-4 transition ${
              isSelected
                ? "border-stone-900 bg-stone-900 text-stone-50"
                : "border-stone-200 bg-white text-stone-900"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect?.(expense.id)}
              className="min-w-0 flex-1 text-left"
              aria-label={`Inspect ${expense.name}`}
            >
              <div className="flex items-center gap-2">
                <p className={`truncate text-base font-semibold ${isSelected ? "text-stone-50" : "text-stone-900"}`}>
                  {expense.name}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.16em] ${
                    isSelected
                      ? "border-stone-700 bg-stone-800 text-stone-200"
                      : "border-stone-200 bg-stone-100 text-stone-500"
                  }`}
                >
                  {expense.category}
                </span>
              </div>

              <div
                className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${
                  isSelected ? "text-stone-300" : "text-stone-500"
                }`}
              >
                <span>{expense.frequency}</span>
                <span>•</span>
                <span>{formatCurrency(expense.amount)}</span>
              </div>
            </button>

            <div className="text-right">
              <p className={`text-sm font-semibold ${isSelected ? "text-stone-50" : "text-stone-900"}`}>
                {formatCurrency(monthlyEstimate)}
              </p>
              <p className={`mt-1 text-[0.7rem] uppercase tracking-[0.14em] ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                / month
              </p>
              <button
                type="button"
                onClick={() => onRemove(expense.id)}
                aria-label={`Remove ${expense.name}`}
                className={`mt-3 text-[0.65rem] font-medium uppercase tracking-[0.18em] transition ${
                  isSelected ? "text-stone-300 hover:text-stone-50" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
