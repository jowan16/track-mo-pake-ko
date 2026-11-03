import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Archive, ChevronLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { CategoryIcon } from '../../lib/icons'
import { fetchBudgets, fetchExpenses, spentByCategory } from '../../lib/queries'
import {
  errMsg,
  monthStart,
  nextMonthStart,
  peso,
  todayStr,
} from '../../lib/format'
import { Field, Modal } from '../../components/ui'
import type { Expense } from '../../lib/types'

const schema = z.object({
  amount: z
    .string()
    .refine(
      (v) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0,
      'Enter an amount greater than 0.'
    )
    .refine((v) => Number(v) <= 9999999.99, 'Amount is too large.'),
  spent_on: z
    .string()
    .min(1, 'Enter a valid date.')
    .refine((v) => v <= todayStr(), 'Date cannot be in the future.'),
  category_id: z.string().min(1, 'Select a category.'),
  payment_method: z.string().min(1),
  note: z.string().max(200, 'Note is too long (200 characters max).').optional(),
})

type Form = z.infer<typeof schema>

const METHODS = ['Cash', 'E-wallet', 'Card', 'Bank transfer']
const PAGE_SIZE = 10

const emptyForm = (): Form => ({
  amount: '',
  spent_on: todayStr(),
  category_id: '',
  payment_method: 'Cash',
  note: '',
})

export default function Expenses() {
  const { profile } = useAuth()
  const { tracked, catById } = useUserData()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()

  // The Add / Edit window. "open" shows it, "editing" is the expense being changed (or null for a new one).
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [warn, setWarn] = useState<{ values: Form; pct: number } | null>(null)

  // Records table: search, category filter and page.
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [page, setPage] = useState(1)
  const cat = params.get('category') ?? ''

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(),
  })

  const catId = watch('category_id')
  const amountStr = watch('amount')

  const month = useQuery({
    queryKey: ['month-budget', profile?.id, y, m],
    queryFn: async () => ({
      budgets: await fetchBudgets(m, y, profile!.id),
      expenses: await fetchExpenses(
        monthStart(y, m),
        nextMonthStart(y, m),
        profile!.id
      ),
    }),
    enabled: !!profile,
  })

  // Budget check shown inside the window.
  const projected = useMemo(() => {
    if (!catId || !month.data) return null

    const budget = month.data.budgets.find(
      (b) => b.category_id === Number(catId)
    )

    if (!budget) return null

    const amt = /^\d+(\.\d{1,2})?$/.test(amountStr) ? Number(amountStr) : 0

    let spent = spentByCategory(month.data.expenses).get(budget.category_id) ?? 0

    // When editing, do not count the old amount twice.
    if (
      editing &&
      editing.category_id === budget.category_id &&
      editing.spent_on >= monthStart(y, m) &&
      editing.spent_on < nextMonthStart(y, m)
    ) {
      spent -= editing.amount
    }

    return Math.round(((spent + amt) / budget.amount) * 100)
  }, [catId, amountStr, month.data, editing, y, m])

  const openAdd = () => {
    setEditing(null)
    setWarn(null)
    reset(emptyForm())
    setOpen(true)
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setWarn(null)
    reset({
      amount: String(e.amount),
      spent_on: e.spent_on,
      category_id: String(e.category_id),
      payment_method: e.payment_method,
      note: e.note ?? '',
    })
    setOpen(true)
  }

  const closeWindow = () => {
    setOpen(false)
    setEditing(null)
    setWarn(null)
  }

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const row = {
        category_id: Number(v.category_id),
        amount: Number(v.amount),
        spent_on: v.spent_on,
        payment_method: v.payment_method,
        note: v.note?.trim() || null,
      }

      const { error } = editing
        ? await supabase
            .from('expenses')
            .update(row)
            .eq('id', editing.id)
            .eq('user_id', profile!.id)
        : await supabase
            .from('expenses')
            .insert({ ...row, user_id: profile!.id })

      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries()
      closeWindow()
    },
    onError: (e) => toast.error(`Could not save. ${errMsg(e)}`),
  })

  const doSave = async (v: Form) => {
    setWarn(null)
    await save.mutateAsync(v).catch(() => undefined)
  }

  const submit = handleSubmit(async (v) => {
    if (projected !== null && projected > 100 && !warn) {
      return setWarn({ values: v, pct: projected })
    }

    await doSave(v)
  })

  // Active (not archived) expenses of this user.
  const list = useQuery({
    queryKey: ['expenses', profile?.id, cat],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('is_archived', false)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false })

      if (cat) query = query.eq('category_id', Number(cat))

      const { data, error } = await query

      if (error) throw error

      return (data as Expense[]).map((e) => ({
        ...e,
        amount: Number(e.amount),
      }))
    },
  })

  const setCategory = (v: string) => {
    const n = new URLSearchParams(params)

    if (v) n.set('category', v)
    else n.delete('category')

    setParams(n, { replace: true })
    setPage(1)
  }

  // Search on note, category name, date and amount.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return (list.data ?? []).filter((e) => {
      if (!q) return true

      const text = `${e.note ?? ''} ${catById.get(e.category_id)?.name ?? ''} ${e.spent_on} ${e.amount} ${e.payment_method}`

      return text.toLowerCase().includes(q)
    })
  }, [list.data, search, catById])

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  // Go back to page 1 when the search changes.
  useEffect(() => {
    setPage(1)
  }, [search])

  // Move the selected expense to the Archive page.
  const archiveExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', profile!.id)
        .eq('is_archived', false)

      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries()
    },
    onError: (e) => toast.error(errMsg(e)),
  })

  const cls = (e?: unknown) => `input ${e ? 'input-bad' : ''}`

  return (
    <>
      {/* PAGE HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Keep track of your spending within your monthly allowance.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} aria-hidden />
          Add Expense
        </button>
      </header>

      {/* EXPENSE RECORDS */}
      <section className="card overflow-hidden border border-line !p-0" aria-label="Expense records">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-xl font-bold leading-tight">Expense Records</h2>
            <p className="mt-0.5 text-sm text-muted">{total} transaction(s) found</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={18}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                aria-label="Search expenses"
                placeholder="Search expenses..."
                className="input !w-64 !pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label htmlFor="f-cat" className="flex items-center gap-2 text-sm text-muted">
              Category:
              <select
                id="f-cat"
                className="input !w-48"
                value={cat}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {tracked.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {list.isLoading ? (
          <p className="border-t border-line p-5 text-sm text-muted">Loading...</p>
        ) : list.error ? (
          <div className="border-t border-line p-5">
            <div className="banner banner-error" role="alert">
              We could not load your expenses. Try again.
            </div>
          </div>
        ) : total === 0 ? (
          <p className="border-t border-line p-5 text-sm text-muted">
            {search || cat ? (
              <>
                No expenses match your filters.{' '}
                <button
                  type="button"
                  className="text-brand underline"
                  onClick={() => {
                    setSearch('')
                    setCategory('')
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              'Add your first expense to see charts and reports.'
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fc]">
                <tr>
                  <th className="th !px-5 !py-4 !text-sm">Date</th>
                  <th className="th !px-5 !py-4 !text-sm">Category</th>
                  <th className="th !px-5 !py-4 !text-sm">Note</th>
                  <th className="th !px-5 !py-4 !text-sm">Amount</th>
                  <th className="th !px-5 !py-4 !text-center !text-sm">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td className="td !px-5 !py-4 whitespace-nowrap">{e.spent_on}</td>
                    <td className="td !px-5 !py-4">{catById.get(e.category_id)?.name}</td>
                    <td className="td !px-5 !py-4">{e.note || '—'}</td>
                    <td className="td !px-5 !py-4 whitespace-nowrap font-bold">{peso(e.amount)}</td>
                    <td className="td !px-5 !py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="rounded-md p-2 text-[#3b49df] hover:bg-[#eef0ff]"
                          aria-label="Edit expense"
                          title="Edit"
                          onClick={() => openEdit(e)}
                        >
                          <Pencil size={18} aria-hidden />
                        </button>

                        <button
                          type="button"
                          className="rounded-md p-2 text-[#ea580c] hover:bg-[#fff1e8] disabled:opacity-50"
                          aria-label="Move expense to archive"
                          title="Move to archive"
                          disabled={archiveExpense.isPending}
                          onClick={() => archiveExpense.mutate(e.id)}
                        >
                          <Archive size={18} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-sm text-muted">
              Showing {start + 1}–{start + visible.length} of {total} transactions
            </p>

            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                className="icon-btn"
                aria-label="Previous page"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>

              <span>
                Page {current} of {pages}
              </span>

              <button
                type="button"
                className="icon-btn"
                aria-label="Next page"
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ADD / EDIT EXPENSE WINDOW */}
      {open && (
        <Modal
          title={editing ? 'Edit expense' : 'Add expense'}
          wide
          onClose={closeWindow}
        >
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => void submit(e)}
              noValidate
            >
              <Field label="Amount (₱)" htmlFor="amount" error={errors.amount?.message}>
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={cls(errors.amount)}
                  {...register('amount')}
                />
              </Field>

              <Field label="Date" htmlFor="spent_on" error={errors.spent_on?.message}>
                <input
                  id="spent_on"
                  type="date"
                  max={todayStr()}
                  className={cls(errors.spent_on)}
                  {...register('spent_on')}
                />
              </Field>

              <Field
                label="Category"
                htmlFor="category_id"
                error={errors.category_id?.message}
              >
                <select
                  id="category_id"
                  className={cls(errors.category_id)}
                  {...register('category_id')}
                >
                  <option value="">Select category</option>
                  {tracked.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Payment method"
                htmlFor="payment_method"
                error={errors.payment_method?.message}
              >
                <select
                  id="payment_method"
                  className="input"
                  {...register('payment_method')}
                >
                  {METHODS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Note (optional, max 200 characters)"
                  htmlFor="note"
                  error={errors.note?.message}
                >
                  <input
                    id="note"
                    className={cls(errors.note)}
                    {...register('note')}
                  />
                </Field>
              </div>

              {warn && (
                <div className="banner banner-warn sm:col-span-2" role="alert">
                  <b>Budget warning.</b>{' '}
                  {catById.get(Number(warn.values.category_id))?.name} will reach{' '}
                  {warn.pct}% of its monthly budget.

                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void doSave(warn.values)}
                    >
                      Save anyway
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => setWarn(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={save.isPending}
                >
                  {save.isPending ? 'Saving...' : editing ? 'Save changes' : 'Save expense'}
                </button>

                <button type="button" className="btn" onClick={closeWindow}>
                  Cancel
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-line p-4">
              <h3 className="mb-1 text-base font-bold">Quick add</h3>
              <p className="mb-3 text-[13px] text-muted">
                Tap an icon to choose a tracked category.
              </p>

              <div className="flex flex-wrap gap-3.5">
                {tracked.map((c) => {
                  const on = String(c.id) === catId

                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={c.name}
                      title={c.name}
                      aria-pressed={on}
                      onClick={() =>
                        setValue('category_id', String(c.id), {
                          shouldValidate: true,
                        })
                      }
                      className="flex flex-col items-center gap-1.5"
                    >
                      <CategoryIcon category={c} size={56} ring={on} />
                      <span
                        className="h-1 w-6 rounded-sm"
                        style={{ background: on ? c.color : 'transparent' }}
                      />
                    </button>
                  )
                })}
              </div>

              <h3 className="mb-1 mt-5 text-base font-bold">Budget check</h3>

              <p className="text-sm text-muted">
                {projected === null
                  ? 'Choose a category with a budget to see its effect.'
                  : `Saving this will bring ${catById.get(Number(catId))?.name} to ${projected}% of its monthly budget.`}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}