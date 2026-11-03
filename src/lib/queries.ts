import { supabase } from './supabase'
import type { Budget, Expense } from './types'

/**
 * Fetch active expenses for the logged-in user between two dates.
 * The end date is exclusive.
 * Expenses without budgets are still included.
 */
export async function fetchExpenses(
  from: string,
  toExclusive: string,
  userId?: string
): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('is_archived', false)
    .gte('spent_on', from)
    .lt('spent_on', toExclusive)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data as Expense[]).map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
  }))
}

/**
 * Fetch active monthly budgets for the logged-in user.
 */
export async function fetchBudgets(
  month: number,
  year: number,
  userId?: string
): Promise<Budget[]> {
  let query = supabase
    .from('budgets')
    .select('*')
    .eq('is_archived', false)
    .eq('month', month)
    .eq('year', year)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data as Budget[]).map((budget) => ({
    ...budget,
    amount: Number(budget.amount),
  }))
}

/**
 * Calculate the total amount.
 */
export const sum = (items: { amount: number }[]) =>
  items.reduce((total, item) => total + Number(item.amount), 0)

/**
 * Calculate total spending per category.
 */
export function spentByCategory(
  expenses: { category_id: number; amount: number }[]
) {
  const totals = new Map<number, number>()

  expenses.forEach((expense) => {
    totals.set(
      expense.category_id,
      (totals.get(expense.category_id) ?? 0) +
        Number(expense.amount)
    )
  })

  return totals
}