import type { ExpenseCategory } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { addExpense, deleteExpense } from "./actions";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GEAR: "Gear",
  RACE_ENTRY: "Event entry",
  COACHING: "Coaching",
  NUTRITION: "Nutrition",
  TRAVEL: "Travel",
  OTHER: "Other",
};


export default async function BudgetPage() {
  const user = await requireUser();
  const userId = user.id;
  const formatEur = (amount: number) => formatMoney(amount, user.currency);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getFullYear(), 0, 1));

  const [expenses, races, monthAgg, yearByCategory] = await Promise.all([
    prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 50,
      include: { race: { select: { name: true } } },
    }),
    prisma.race.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { id: true, name: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId, date: { gte: yearStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  const yearTotal = yearByCategory.reduce(
    (sum, row) => sum + (row._sum.amount ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Budget</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-foreground/60">This month</p>
          <p className="text-2xl font-semibold">
            {formatEur(monthAgg._sum.amount ?? 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-foreground/60">
            This year ({now.getFullYear()})
          </p>
          <p className="text-2xl font-semibold">{formatEur(yearTotal)}</p>
        </div>
      </div>

      {yearByCategory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">By category (this year)</h2>
          <div className="space-y-2">
            {yearByCategory.map((row) => {
              const amount = row._sum.amount ?? 0;
              const pct = yearTotal > 0 ? (amount / yearTotal) * 100 : 0;
              return (
                <div key={row.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{CATEGORY_LABELS[row.category]}</span>
                    <span className="text-foreground/70">
                      {formatEur(amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/[0.06]">
                    <div
                      className="h-2 rounded-full bg-foreground/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add expense</h2>
        <form
          action={addExpense}
          className="flex flex-wrap items-end gap-3 card p-4"
        >
          <div className="space-y-1">
            <label htmlFor="date" className="block text-sm font-medium">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={now.toISOString().slice(0, 10)}
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="amount" className="block text-sm font-medium">
              Amount ({user.currency})
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="w-28 rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="category" className="block text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="raceId" className="block text-sm font-medium">
              Event (optional)
            </label>
            <select
              id="raceId"
              name="raceId"
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              <option value="">—</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="note" className="block text-sm font-medium">
              Note (optional)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              maxLength={200}
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-foreground/70">No expenses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-foreground/60">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Note</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-line"
                  >
                    <td className="py-2 pr-4">
                      {expense.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-2 pr-4">
                      {CATEGORY_LABELS[expense.category]}
                    </td>
                    <td className="py-2 pr-4">{formatEur(expense.amount)}</td>
                    <td className="py-2 pr-4">{expense.race?.name ?? "—"}</td>
                    <td className="py-2 pr-4">{expense.note ?? "—"}</td>
                    <td className="py-2">
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={expense.id} />
                        <button
                          type="submit"
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
