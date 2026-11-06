
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { CategoryIcon } from '../../lib/icons'
import { fetchBudgets, fetchExpenses, spentByCategory, sum } from '../../lib/queries'
import { errMsg, monthStart, nextMonthStart, peso } from '../../lib/format'
import { Field, PageLoader, PageTitle, ProgressBar } from '../../components/ui'

export default function Budgets() {
  const { profile } = useAuth()
  const { tracked, catById } = useUserData()
  const qc = useQueryClient()

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [catId, setCatId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<{ cat?: string; amount?: string }>({})

  const { data, isLoading } = useQuery({
    queryKey: ['budgets', profile?.id, y, m],
    enabled: !!profile,
    queryFn: async () => ({
      budgets: await fetchBudgets(m, y, profile!.id),
      expenses: await fetchExpenses(
        monthStart(y, m),
        nextMonthStart(y, m),
        profile!.id
      ),
    }),
  })

  const closeForm = () => {
    setOpen(false)
    setEditingId(null)
    setCatId('')
    setAmount('')
    setError({})
  }

  // Allow only digits and one decimal point, with up to 2 decimal places.
  const handleAmountChange = (value: string) => {
    let cleaned = value.replace(/[^\d.]/g, '')

    const parts = cleaned.split('.')

    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join('')}`
    }

    const [whole, decimal] = cleaned.split('.')

    if (decimal !== undefined) {
      cleaned = `${whole}.${decimal.slice(0, 2)}`
    }

    setAmount(cleaned)

    if (error.amount) {
      setError((prev) => ({ ...prev, amount: undefined }))
    }
  }

  const save = useMutation({
    mutationFn: async (values: {
      id: string | null
      categoryId: number
      amount: number
    }) => {
      if (values.id) {
        const { error: e } = await supabase
          .from('budgets')
          .update({
            category_id: values.categoryId,
            amount: values.amount,
          })
          .eq('id', values.id)
          .eq('user_id', profile!.id)
          .eq('is_archived', false)

        if (e) throw e
      } else {
        const { error: e } = await supabase.from('budgets').insert({
          user_id: profile!.id,
          category_id: values.categoryId,
          month: m,
          year: y,
          amount: values.amount,
          is_archived: false,
        })

        if (e) throw e
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries()
      closeForm()
    },
    onError: (e: { code?: string }) => {
      if (e?.code === '23505') {
        setError({
          cat: `An active budget for ${catById.get(Number(catId))?.name} already exists this month.`,
        })
      } else {
        toast.error(errMsg(e))
      }
    },
  })

  // Move the selected budget to the Archive page.
  const archiveBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase
        .from('budgets')
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', profile!.id)
        .eq('is_archived', false)

      if (e) throw e
    },
    onSuccess: () => {
      void qc.invalidateQueries()
    },
    onError: (e) => toast.error(errMsg(e)),
  })

  const startNew = () => {
    setEditingId(null)
    setCatId('')
    setAmount('')
    setError({})
    setOpen(true)
  }

  const startEdit = (budget: {
    id: string
    category_id: number
    amount: number
  }) => {
    setEditingId(budget.id)
    setCatId(String(budget.category_id))
    setAmount(String(budget.amount))
    setError({})
    setOpen(true)
  }

  const submit = () => {
    const next: typeof error = {}

    if (!catId) {
      next.cat = 'Select a category.'
    } else if (!tracked.some((c) => c.id === Number(catId))) {
      next.cat = 'Track this category first.'
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      next.amount =
        'Enter a valid amount greater than 0 (maximum 2 decimal places).'
    }

    setError(next)

    if (!next.cat && !next.amount) {
      save.mutate({
        id: editingId,
        categoryId: Number(catId),
        amount: Number(amount),
      })
    }
  }

  if (isLoading || !data) return <PageLoader />

  // Include only active budgets belonging to currently tracked categories.
  const rows = data.budgets.filter(
    (b) =>
      !b.is_archived &&
      tracked.some((c) => c.id === b.category_id)
  )

  // Include expenses belonging to currently tracked categories.
  const trackedExpenses = data.expenses.filter((e) =>
    tracked.some((c) => c.id === e.category_id)
  )

  const spent = spentByCategory(trackedExpenses)

  // Calculate the monthly summary.
  const monthlyAllowance = sum(rows)
  const totalSpent = sum(trackedExpenses)

  // Only expenses in categories with an active budget are deducted.
  const budgetUsed = rows.reduce(
    (total, budget) =>
      total + (spent.get(budget.category_id) ?? 0),
    0
  )

  const remainingBudget = monthlyAllowance - budgetUsed

  // A category is available if it has no active budget this month.
  // Archived budgets must not prevent users from creating a new one.
  const free = tracked.filter(
    (c) =>
      !data.budgets.some(
        (b) => b.category_id === c.id && !b.is_archived
      )
  )

  return (
    <>
      <PageTitle
        title={`Budgets · ${now.toLocaleString('en-US', {
          month: 'long',
        })}`}
      >
        <button className="btn btn-primary" onClick={startNew}>
          + New budget
        </button>
      </PageTitle>

      {/* MONTHLY BUDGET SUMMARY */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Monthly budget summary"
      >
        <div className="card">
          <p className="text-sm text-muted">Monthly Allowance</p>
          <h2 className="mt-2 text-2xl font-bold">
            {peso(monthlyAllowance)}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Total of your set budgets this month
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-muted">Total Spent</p>
          <h2 className="mt-2 text-2xl font-bold">
            {peso(totalSpent)}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Total recorded expenses this month
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-muted">Remaining Budget</p>
          <h2
            className={`mt-2 text-2xl font-bold ${
              remainingBudget < 0 ? 'text-danger' : 'text-brand'
            }`}
          >
            {peso(remainingBudget)}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Remaining from your set budgets
          </p>
        </div>
      </section>

      {/* NEW OR EDIT BUDGET FORM */}
      {open && (
        <section
          className="card grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          aria-label={editingId ? 'Edit budget' : 'New budget'}
        >
          <Field label="Category" htmlFor="b-cat" error={error.cat}>
            <select
              id="b-cat"
              className={`input ${error.cat ? 'input-bad' : ''}`}
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
            >
              <option value="">Select category</option>
              {(editingId ? tracked : free).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Monthly limit (₱)"
            htmlFor="b-amt"
            error={error.amount}
          >
            <input
              id="b-amt"
              type="text"
              inputMode="decimal"
              className={`input ${error.amount ? 'input-bad' : ''}`}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter monthly limit"
              autoComplete="off"
            />
          </Field>

          <div className="flex gap-2 sm:pt-[26px]">
            <button
              className="btn btn-primary"
              disabled={save.isPending}
              onClick={submit}
            >
              {save.isPending
                ? 'Saving...'
                : editingId
                  ? 'Update budget'
                  : 'Save budget'}
            </button>

            <button className="btn" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* CATEGORY BUDGETS */}
      <section className="card flex flex-col gap-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            No budgets yet. Use New budget to set a monthly limit for a
            category.
          </p>
        ) : (
          rows.map((b) => {
            const c = catById.get(b.category_id)
            const s = spent.get(b.category_id) ?? 0
            const pct = (s / b.amount) * 100

            return (
              <div key={b.id} className="text-sm">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-bold">
                    {c && <CategoryIcon category={c} size={28} />}
                    {c?.name}
                  </span>

                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      {peso(s)} of {peso(b.amount)} ({Math.round(pct)}%)
                    </span>

                    <button
                      type="button"
                      className="icon-btn !h-8 !w-8"
                      aria-label={`Edit budget for ${c?.name}`}
                      title="Edit budget"
                      onClick={() => startEdit(b)}
                    >
                      <Pencil size={15} aria-hidden />
                    </button>

                    <button
                      type="button"
                      className="icon-btn !h-8 !w-8"
                      aria-label={`Move budget for ${c?.name} to archive`}
                      title="Move to archive"
                      disabled={archiveBudget.isPending}
                      onClick={() => archiveBudget.mutate(b.id)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </span>
                </div>

                <ProgressBar percent={pct} />

                {pct >= 100 ? (
                  <div className="mt-1.5 text-[13px] text-danger">
                    Over budget
                  </div>
                ) : (
                  pct >= 80 && (
                    <div className="mt-1.5 text-[13px] text-[#9a3412]">
                      Alert at 80% reached
                    </div>
                  )
                )}
              </div>
            )
          })
        )}
      </section>
    </>
  )
}
