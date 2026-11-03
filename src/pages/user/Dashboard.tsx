
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
} from 'recharts'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { CategoryIcon } from '../../lib/icons'
import { supabase } from '../../lib/supabase'
import {
  fetchBudgets,
  fetchExpenses,
  spentByCategory,
  sum,
} from '../../lib/queries'
import {
  errMsg,
  monthStart,
  nextMonthStart,
  pad,
  peso,
  shortDate,
} from '../../lib/format'
import {
  ConfirmDialog,
  Modal,
  PageLoader,
  PageTitle,
  ProgressBar,
} from '../../components/ui'

export default function Dashboard() {
  const { profile } = useAuth()
  const {
    tracked,
    trackedIds,
    pickerOptions,
    catById,
    refresh,
  } = useUserData()

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [pickedCategories, setPickedCategories] = useState<Set<number>>(
    new Set(trackedIds),
  )
  const [categoryError, setCategoryError] = useState('')
  const [confirmUntrack, setConfirmUntrack] = useState<string[] | null>(null)
  const [savingCategories, setSavingCategories] = useState(false)

  useEffect(() => {
    setPickedCategories(new Set(trackedIds))
  }, [trackedIds])

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', profile?.id],
    queryFn: async () => {
      const first = new Date(y, m - 6, 1)

      const [expenses, budgets] = await Promise.all([
        fetchExpenses(
          monthStart(first.getFullYear(), first.getMonth() + 1),
          nextMonthStart(y, m),
          profile!.id,
        ),
        fetchBudgets(m, y, profile!.id),
      ])

      return {
        expenses,
        budgets,
      }
    },
    enabled: !!profile,
  })

  // Apply category changes to Supabase.
  const applyCategoryChanges = async (
    added: number[],
    removed: number[],
  ) => {
    if (!profile) return

    if (removed.length) {
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', profile.id)
        .in('category_id', removed)

      if (error) {
        toast.error(errMsg(error))
        return
      }
    }

    if (added.length) {
      const { error } = await supabase
        .from('user_categories')
        .insert(
          added.map((category_id) => ({
            user_id: profile.id,
            category_id,
          })),
        )

      if (error) {
        toast.error(errMsg(error))
        return
      }
    }

    await refresh()
    setConfirmUntrack(null)
    setCategoryModalOpen(false)
    toast.success('Categories saved.')
  }

  // Save selected categories.
  const saveCategories = async () => {
    if (!profile) return

    if (pickedCategories.size === 0) {
      setCategoryError('Select at least one category to continue.')
      return
    }

    setCategoryError('')
    setSavingCategories(true)

    try {
      const added = [...pickedCategories].filter(
        (id) => !trackedIds.has(id),
      )

      const removed = [...trackedIds].filter(
        (id) => !pickedCategories.has(id),
      )

      if (removed.length) {
        const currentDate = new Date()

        const budgets = await fetchBudgets(
          currentDate.getMonth() + 1,
          currentDate.getFullYear(),
          profile.id,
        )

        const withBudget = removed
          .filter((id) =>
            budgets.some((budget) => budget.category_id === id),
          )
          .map((id) => catById.get(id)?.name ?? 'A category')

        if (withBudget.length) {
          setConfirmUntrack(withBudget)
          return
        }
      }

      await applyCategoryChanges(added, removed)
    } catch (error) {
      toast.error(errMsg(error))
    } finally {
      setSavingCategories(false)
    }
  }

  // Confirm untracking categories that have budgets.
  const confirmCategoryChanges = async () => {
    const added = [...pickedCategories].filter(
      (id) => !trackedIds.has(id),
    )

    const removed = [...trackedIds].filter(
      (id) => !pickedCategories.has(id),
    )

    await applyCategoryChanges(added, removed)
  }

  if (isLoading) return <PageLoader />

  if (error) {
    console.error('Dashboard loading error:', error)

    const errorDetails =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
        : JSON.stringify(error, null, 2) ?? String(error)

    return (
      <div className="banner banner-error" role="alert">
        <p>We could not load your dashboard.</p>
        <pre className="mt-2 text-sm whitespace-pre-wrap">
          {errorDetails}
        </pre>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="banner banner-error" role="alert">
        Dashboard data is empty. Please try again.
      </div>
    )
  }

  const monthStr = monthStart(y, m)

  const mine = data.expenses.filter((e) =>
    trackedIds.has(e.category_id),
  )

  const thisMonth = mine.filter((e) => e.spent_on >= monthStr)
  const spent = spentByCategory(thisMonth)

  const budgetRows = data.budgets.filter((b) =>
    trackedIds.has(b.category_id),
  )

  const budgetTotal = sum(budgetRows)

  const budgetUsed = budgetRows.reduce(
    (t, b) => t + (spent.get(b.category_id) ?? 0),
    0,
  )

  // Dashboard summary values for the current month.
  const totalExpense = sum(thisMonth)
  const budgetRemaining = budgetTotal - budgetUsed
  const trackedCategoryCount = tracked.length
  const expenseEntries = thisMonth.length

  const donut = tracked
    .map((c) => ({
      name: c.name,
      value: spent.get(c.id) ?? 0,
      color: c.color,
    }))
    .filter((d) => d.value > 0)

  const donutTotal = donut.reduce((t, d) => t + d.value, 0)

  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

    return {
      label: d.toLocaleString('en-US', { month: 'short' }),
      total: sum(
        mine.filter((e) => e.spent_on.startsWith(key)),
      ),
      current: i === 5,
    }
  })

  return (
    <>
      <PageTitle title="Dashboard" sub={undefined}>
        <Link to="/app/budgets" className="btn btn-primary">
          + Add Budget
        </Link>
      </PageTitle>

      <p className="-mt-3 text-sm text-muted">
        {now.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
        })}{' '}
        · Tracking {tracked.length} categories
      </p>

      {/* MONTHLY FINANCIAL SUMMARY */}
      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="Monthly financial summary"
      >
        <div className="card">
          <div className="text-[13px] text-muted">Total Expense</div>
          <div className="mt-1.5 text-[26px] font-bold">
            {peso(totalExpense)}
          </div>
          <p className="mt-1 text-xs text-muted">
            Total recorded expenses this month
          </p>
        </div>

        <div className="card">
          <div className="text-[13px] text-muted">Budget Remaining</div>
          <div
            className={`mt-1.5 text-[26px] font-bold ${
              budgetRemaining < 0 ? 'text-danger' : 'text-brand'
            }`}
          >
            {peso(budgetRemaining)}
          </div>
          <p className="mt-1 text-xs text-muted">
            Remaining from your set budget
          </p>
        </div>

        <div className="card">
          <div className="text-[13px] text-muted">Track Categories</div>
          <div className="mt-1.5 text-[26px] font-bold">
            {trackedCategoryCount}
          </div>
          <p className="mt-1 text-xs text-muted">
            Number of categories you track
          </p>
        </div>

        <div className="card">
          <div className="text-[13px] text-muted">Expenses Entries</div>
          <div className="mt-1.5 text-[26px] font-bold">
            {expenseEntries}
          </div>
          <p className="mt-1 text-xs text-muted">
            Number of recorded expenses this month
          </p>
        </div>
      </section>

      {/* YOUR CATEGORIES */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-base font-bold">Your categories</h2>
          <span className="text-[13px] text-muted">
            Tap an icon to open that category
          </span>
        </div>

        <div className="card flex flex-wrap gap-5">
          {tracked.map((c) => (
            <Link
              key={c.id}
              to={`/app/expenses?category=${c.id}`}
              aria-label={c.name}
              title={c.name}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <CategoryIcon category={c} size={68} />
            </Link>
          ))}

          {/* ADD / MANAGE CATEGORY ICON */}
          <button
            type="button"
            onClick={() => {
              setPickedCategories(new Set(trackedIds))
              setCategoryError('')
              setCategoryModalOpen(true)
            }}
            aria-label="Manage categories"
            title="Manage categories"
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-[#9aa6a1] text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <Plus size={28} aria-hidden />
          </button>
        </div>
      </section>

      {/* CHARTS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-base font-bold">
            Spending by category
          </h2>

          {donut.length === 0 ? (
            <p className="text-sm text-muted">
              Add your first expense to see charts and reports.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div
                className="h-40 w-40"
                role="img"
                aria-label="Donut chart of spending by category"
              >
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      innerRadius={42}
                      outerRadius={72}
                      stroke="none"
                    >
                      {donut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="flex flex-col gap-2 text-sm">
                {donut.map((d) => (
                  <li key={d.name}>
                    <b style={{ color: d.color }}>■</b> {d.name} ·{' '}
                    {Math.round((d.value / donutTotal) * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-bold">Monthly trend</h2>

          <div
            className="h-40"
            role="img"
            aria-label="Bar chart of monthly spending"
          >
            <ResponsiveContainer>
              <BarChart data={trend}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {trend.map((t) => (
                    <Cell
                      key={t.label}
                      fill={t.current ? '#0f766e' : '#a0d3cc'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RECENT TRANSACTIONS AND BUDGET PROGRESS */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card overflow-x-auto">
          <h2 className="mb-2 text-base font-bold">
            Recent transactions
          </h2>

          {mine.length === 0 ? (
            <p className="text-sm text-muted">
              No expenses yet.{' '}
              <Link
                to="/app/expenses"
                className="text-brand underline"
              >
                Add expense
              </Link>
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Note</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {mine.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td className="td">{shortDate(e.spent_on)}</td>
                    <td className="td">{e.note || '-'}</td>
                    <td className="td">
                      {catById.get(e.category_id)?.name}
                    </td>
                    <td className="td text-right">{peso(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-bold">Budget progress</h2>

          {budgetRows.length === 0 ? (
            <p className="text-sm text-muted">
              No budgets yet.{' '}
              <Link
                to="/app/budgets"
                className="text-brand underline"
              >
                Set a budget
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {budgetRows.map((b) => {
                const pct =
                  ((spent.get(b.category_id) ?? 0) / b.amount) * 100

                return (
                  <div key={b.id} className="text-sm">
                    <div className="mb-1.5 flex justify-between">
                      <span>
                        {catById.get(b.category_id)?.name}
                      </span>
                      <span>{Math.round(pct)}% used</span>
                    </div>

                    <ProgressBar percent={pct} />

                    {pct >= 80 && (
                      <div className="mt-1.5 text-[13px] text-[#b45309]">
                        Warning: near the 100% limit
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* MANAGE CATEGORIES MODAL */}
      {categoryModalOpen && (
        <Modal
          title="Manage Categories"
          onClose={() => setCategoryModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted">
              Select the categories you want to track. Untracked categories
              will be hidden from expense forms and dashboard charts. Past
              records will be kept.
            </p>

            {/* ORGANIZED CATEGORY GRID */}
            <div className="grid grid-cols-2 gap-3 border-y border-line py-4 lg:grid-cols-3">
              {pickerOptions.map((category) => {
                const isSelected = pickedCategories.has(category.id)

                return (
                  <label
                    key={category.id}
                    className={`flex min-h-[105px] min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                      isSelected
                        ? 'border-brand bg-[var(--surface)]'
                        : 'border-line hover:bg-[var(--surface)]'
                    }`}
                  >
                    {/* CATEGORY NAME */}
                    <span className="w-full break-words text-sm font-semibold leading-snug text-main">
                      {category.name}
                    </span>

                    {/* CHECKBOX AND ICON */}
                    <div className="flex items-center justify-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        checked={isSelected}
                        onChange={() => {
                          setCategoryError('')

                          setPickedCategories((current) => {
                            const next = new Set(current)

                            if (next.has(category.id)) {
                              next.delete(category.id)
                            } else {
                              next.add(category.id)
                            }

                            return next
                          })
                        }}
                      />

                      <CategoryIcon category={category} size={36} />
                    </div>
                  </label>
                )
              })}
            </div>

            {categoryError && (
              <p className="field-error" role="alert">
                {categoryError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void saveCategories()}
                disabled={savingCategories}
              >
                {savingCategories ? 'Saving...' : 'Save Categories'}
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setCategoryModalOpen(false)}
                disabled={savingCategories}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION BEFORE UNTRACKING CATEGORIES WITH BUDGETS */}
      {confirmUntrack && (
        <ConfirmDialog
          title="Stop tracking these categories?"
          message={`${confirmUntrack.join(', ')} ${
            confirmUntrack.length > 1 ? 'have budgets' : 'has a budget'
          }. Untracking pauses alerts. Past records are kept.`}
          confirmLabel="Untrack"
          onConfirm={() => void confirmCategoryChanges()}
          onCancel={() => setConfirmUntrack(null)}
        />
      )}
    </>
  )
}
