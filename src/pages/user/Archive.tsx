
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { errMsg, peso, shortDate } from '../../lib/format'
import { ConfirmDialog, PageLoader, PageTitle } from '../../components/ui'
import { CategoryIcon } from '../../lib/icons'
import type { Budget, Expense } from '../../lib/types'

type Tab = 'expenses' | 'budgets'

type PendingAction = {
  type: 'expense' | 'budget'
  action: 'restore' | 'delete'
  id: string
  description: string
}

export default function Archive() {
  const { profile } = useAuth()
  const { catById } = useUserData()
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('expenses')
  const [pending, setPending] = useState<PendingAction | null>(null)

  // Bulk expense selection states
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const archived = useQuery({
    queryKey: ['archived-records', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const [expenseResult, budgetResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', profile!.id)
          .eq('is_archived', true)
          .order('spent_on', { ascending: false }),

        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', profile!.id)
          .eq('is_archived', true)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ])

      if (expenseResult.error) throw expenseResult.error
      if (budgetResult.error) throw budgetResult.error

      return {
        expenses: (expenseResult.data as Expense[]).map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),

        budgets: (budgetResult.data as Budget[]).map((b) => ({
          ...b,
          amount: Number(b.amount),
        })),
      }
    },
  })

  // Individual restore and delete mutation
  const action = useMutation({
    mutationFn: async (item: PendingAction) => {
      const table = item.type === 'expense' ? 'expenses' : 'budgets'

      if (item.action === 'restore') {
        const { error } = await supabase
          .from(table)
          .update({ is_archived: false })
          .eq('id', item.id)
          .eq('user_id', profile!.id)
          .eq('is_archived', true)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', item.id)
          .eq('user_id', profile!.id)
          .eq('is_archived', true)

        if (error) throw error
      }
    },

    onSuccess: (_, item) => {
      const record = item.type === 'expense' ? 'Expense' : 'Budget'

      toast.success(
        item.action === 'restore'
          ? `${record} restored successfully.`
          : `${record} permanently deleted.`
      )

      setPending(null)

      if (item.type === 'expense') {
        setSelectedExpenses((prev) =>
          prev.filter((id) => id !== item.id)
        )
      }

      void qc.invalidateQueries({
        queryKey: ['archived-records', profile?.id],
      })
    },

    onError: (e) => toast.error(errMsg(e)),
  })

  // Bulk permanent deletion mutation
  const bulkDelete = useMutation({
    mutationFn: async () => {
      if (!profile?.id || selectedExpenses.length === 0) {
        throw new Error('No expenses selected.')
      }

      const idsToDelete = [...selectedExpenses]

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', profile.id)
        .eq('is_archived', true)
        .in('id', idsToDelete)

      if (error) throw error

      return idsToDelete.length
    },

    onSuccess: (deletedCount) => {
      toast.success(
        `${deletedCount} expense(s) permanently deleted.`
      )

      setSelectedExpenses([])
      setShowBulkDeleteConfirm(false)

      void qc.invalidateQueries({
        queryKey: ['archived-records', profile?.id],
      })
    },

    onError: (error) => {
      toast.error(errMsg(error))
    },
  })

  if (archived.isLoading) return <PageLoader />

  if (archived.error || !archived.data) {
    return (
      <>
        <PageTitle title="Archived" />

        <section className="card">
          <p className="text-sm text-danger">
            We could not load your archived records. Please try again.
          </p>

          <button
            className="btn mt-3"
            onClick={() => void archived.refetch()}
          >
            Try again
          </button>
        </section>
      </>
    )
  }

  const expenses = archived.data.expenses
  const budgets = archived.data.budgets

  // Select All checkbox state
  const allExpensesSelected =
    expenses.length > 0 &&
    expenses.every((expense) =>
      selectedExpenses.includes(expense.id)
    )

  const monthName = (month: number, year: number) =>
    new Date(year, month - 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    })

  const askAction = (
    type: 'expense' | 'budget',
    actionType: 'restore' | 'delete',
    id: string,
    description: string
  ) => {
    setPending({
      type,
      action: actionType,
      id,
      description,
    })
  }

  // Select or deselect all expenses
  const toggleSelectAll = () => {
    if (allExpensesSelected) {
      setSelectedExpenses([])
    } else {
      setSelectedExpenses(expenses.map((expense) => expense.id))
    }
  }

  // Select or deselect an individual expense
  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id)
        ? prev.filter((expenseId) => expenseId !== id)
        : [...prev, id]
    )
  }

  return (
    <>
      <PageTitle title="Archived" />

      <section className="card">
        <p className="mb-4 text-sm text-muted">
          Review, restore, or permanently delete your archived expenses.
        </p>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            className={`btn ${tab === 'expenses' ? 'btn-primary' : ''}`}
            onClick={() => setTab('expenses')}
          >
            Expenses ({expenses.length})
          </button>
        </div>

        {tab === 'expenses' && (
          <>
            {expenses.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-semibold">
                  No archived expenses
                </p>

                <p className="mt-1 text-sm text-muted">
                  Expenses you archive will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Bulk Delete Controls */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={allExpensesSelected}
                      onChange={toggleSelectAll}
                      disabled={bulkDelete.isPending}
                      aria-label="Select all expenses"
                      className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                    />

                    Select All Expenses
                  </label>

                  {selectedExpenses.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-danger flex items-center gap-2"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      disabled={bulkDelete.isPending || action.isPending}
                    >
                      <Trash2 size={16} aria-hidden />
                      Delete Selected ({selectedExpenses.length})
                    </button>
                  )}
                </div>

                {selectedExpenses.length > 0 && (
                  <p className="mb-3 text-sm text-muted">
                    {selectedExpenses.length} expense(s) selected.
                  </p>
                )}

                {/* Archived Expenses Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Select</th>
                        <th className="th">Date</th>
                        <th className="th">Category</th>
                        <th className="th">Note</th>
                        <th className="th text-right">Amount</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {expenses.map((expense) => {
                        const category = catById.get(expense.category_id)

                        return (
                          <tr key={expense.id}>
                            {/* Individual Selection */}
                            <td className="td">
                              <input
                                type="checkbox"
                                checked={selectedExpenses.includes(expense.id)}
                                onChange={() =>
                                  toggleExpenseSelection(expense.id)
                                }
                                disabled={bulkDelete.isPending}
                                aria-label={`Select expense ${expense.id}`}
                                className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                              />
                            </td>

                            <td className="td whitespace-nowrap">
                              {shortDate(expense.spent_on)}
                            </td>

                            <td className="td">
                              <span className="flex items-center gap-2">
                                {category && (
                                  <CategoryIcon
                                    category={category}
                                    size={28}
                                  />
                                )}

                                {category?.name ?? 'Unknown category'}
                              </span>
                            </td>

                            <td className="td">
                              {expense.note || '-'}
                            </td>

                            <td className="td text-right whitespace-nowrap">
                              {peso(expense.amount)}
                            </td>

                            <td className="td">
                              <div className="flex justify-end gap-2">
                                {/* Restore Expense */}
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Restore expense"
                                  aria-label="Restore expense"
                                  disabled={
                                    action.isPending ||
                                    bulkDelete.isPending
                                  }
                                  onClick={() =>
                                    askAction(
                                      'expense',
                                      'restore',
                                      expense.id,
                                      `${category?.name ?? 'expense'} · ${peso(expense.amount)}`
                                    )
                                  }
                                >
                                  <RotateCcw size={18} aria-hidden />
                                </button>

                                {/* Delete Individual Expense */}
                                <button
                                  type="button"
                                  className="icon-btn text-danger"
                                  title="Delete permanently"
                                  aria-label="Delete expense permanently"
                                  disabled={
                                    action.isPending ||
                                    bulkDelete.isPending
                                  }
                                  onClick={() =>
                                    askAction(
                                      'expense',
                                      'delete',
                                      expense.id,
                                      `${category?.name ?? 'expense'} · ${peso(expense.amount)}`
                                    )
                                  }
                                >
                                  <Trash2 size={18} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'budgets' && (
          <>
            {budgets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-semibold">
                  No archived budgets
                </p>

                <p className="mt-1 text-sm text-muted">
                  Budgets you archive will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Month</th>
                      <th className="th">Category</th>
                      <th className="th text-right">Budget amount</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {budgets.map((budget) => {
                      const category = catById.get(budget.category_id)
                      const period = monthName(budget.month, budget.year)

                      return (
                        <tr key={budget.id}>
                          <td className="td whitespace-nowrap">
                            {period}
                          </td>

                          <td className="td">
                            <span className="flex items-center gap-2">
                              {category && (
                                <CategoryIcon
                                  category={category}
                                  size={28}
                                />
                              )}

                              {category?.name ?? 'Unknown category'}
                            </span>
                          </td>

                          <td className="td text-right whitespace-nowrap">
                            {peso(budget.amount)}
                          </td>

                          <td className="td">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Restore budget"
                                aria-label="Restore budget"
                                disabled={action.isPending}
                                onClick={() =>
                                  askAction(
                                    'budget',
                                    'restore',
                                    budget.id,
                                    `${category?.name ?? 'budget'} · ${period}`
                                  )
                                }
                              >
                                <RotateCcw size={18} aria-hidden />
                              </button>

                              <button
                                type="button"
                                className="icon-btn text-danger"
                                title="Delete permanently"
                                aria-label="Delete budget permanently"
                                disabled={action.isPending}
                                onClick={() =>
                                  askAction(
                                    'budget',
                                    'delete',
                                    budget.id,
                                    `${category?.name ?? 'budget'} · ${period}`
                                  )
                                }
                              >
                                <Trash2 size={18} aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Individual Action Confirmation */}
      {pending && (
        <ConfirmDialog
          title={
            pending.action === 'restore'
              ? `Restore this ${pending.type}?`
              : `Permanently delete this ${pending.type}?`
          }
          message={
            pending.action === 'restore'
              ? `Restore ${pending.description}? It will appear again in your active ${pending.type === 'expense' ? 'expenses' : 'budgets'}.`
              : `Are you sure you want to permanently delete ${pending.description}? This action cannot be undone.`
          }
          confirmLabel={
            pending.action === 'restore'
              ? 'Restore'
              : 'Delete permanently'
          }
          danger={pending.action === 'delete'}
          busy={action.isPending}
          onConfirm={() => action.mutate(pending)}
          onCancel={() => setPending(null)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <ConfirmDialog
          title="Permanently delete selected expenses?"
          message={`Are you sure you want to permanently delete ${selectedExpenses.length} selected expense(s)? This action cannot be undone.`}
          confirmLabel="Delete All Selected"
          danger
          busy={bulkDelete.isPending}
          onConfirm={() => bulkDelete.mutate()}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </>
  )
}
