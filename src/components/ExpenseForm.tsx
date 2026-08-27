"use client";

import { useId, useState } from "react";

import {
  calculateMonthlyEstimate,
  formatCurrency,
} from "@/lib/calculations";
import {
  CATEGORY_OPTIONS,
  FREQUENCY_OPTIONS,
  type Category,
  type ExpenseFormValues,
  type Frequency,
} from "@/types/expense";

interface ExpenseFormProps {
  onAdd: (values: ExpenseFormValues) => void;
}

const initialValues: ExpenseFormValues = {
  name: "",
  amount: 0,
  category: "Food",
  frequency: "Daily",
};

export function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const amountId = useId();
  const categoryId = useId();
  const previewMonthly = calculateMonthlyEstimate(values.amount, values.frequency);

  const handleChange = (field: keyof ExpenseFormValues, value: string) => {
    setError(null);

    if (field === "name") {
      setValues((current) => ({ ...current, name: value }));
      return;
    }

    if (field === "amount") {
      const parsed = Number(value);
      setValues((current) => ({ ...current, amount: Number.isFinite(parsed) ? parsed : 0 }));
      return;
    }

    if (field === "category") {
      setValues((current) => ({ ...current, category: value as Category }));
      return;
    }

    setValues((current) => ({ ...current, frequency: value as Frequency }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = values.name.trim();

    if (!trimmed) {
      setError("Give this expense a name so we can track it properly.");
      return;
    }

    if (values.amount <= 0) {
      setError("The amount needs to be more than KSh 0.");
      return;
    }

    onAdd({
      name: trimmed,
      amount: values.amount,
      category: values.category,
      frequency: values.frequency,
    });

    setValues(initialValues);
    setError(null);
  };

  const isSubmitDisabled = values.name.trim().length === 0 || values.amount <= 0;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-[2rem] border border-stone-200 bg-stone-50/90 p-4 shadow-[0_12px_40px_rgba(28,25,23,0.04)] sm:p-5"
      aria-label="Add a new expense"
    >
      <div className="space-y-2">
        <label htmlFor={nameId} className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
          What got you?
        </label>
        <input
          id={nameId}
          value={values.name}
          onChange={(event) => handleChange("name", event.target.value)}
          placeholder="e.g. Morning coffee"
          aria-invalid={Boolean(error && !values.name.trim())}
          className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={amountId} className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Amount
          </label>
          <div className="flex items-center rounded-2xl border border-stone-200 bg-white px-3 py-3 focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-200">
            <span className="mr-2 text-sm font-medium text-stone-500">KSh</span>
            <input
              id={amountId}
              type="number"
              min="1"
              step="1"
              value={values.amount || ""}
              onChange={(event) => handleChange("amount", event.target.value)}
              placeholder="150"
              aria-invalid={Boolean(error && values.amount <= 0)}
              className="w-full bg-transparent text-base text-stone-900 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={categoryId} className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Category
          </label>
          <select
            id={categoryId}
            value={values.category}
            onChange={(event) => handleChange("category", event.target.value)}
            className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">How often?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FREQUENCY_OPTIONS.map((frequency) => (
            <button
              key={frequency}
              type="button"
              onClick={() => handleChange("frequency", frequency)}
              className={`rounded-2xl border px-3 py-2 text-sm font-medium transition active:translate-y-[1px] ${
                values.frequency === frequency
                  ? "border-stone-900 bg-stone-900 text-stone-50"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
              }`}
              aria-pressed={values.frequency === frequency}
            >
              {frequency}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
        <span className="font-medium text-stone-600">Estimated monthly cost</span>
        <span className="font-semibold text-stone-900">{formatCurrency(previewMonthly)}</span>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Add expense
      </button>
    </form>
  );
}
