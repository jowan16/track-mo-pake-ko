import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutGrid,
  PiggyBank,
  Plus,
  Receipt,
  TrendingDown,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { CategoryIcon } from '../../lib/icons'
import { fetchBudgets, fetchExpenses, spentByCategory, sum } from '../../lib/queries'
import { monthStart, nextMonthStart, pad, peso, shortDate } from '../../lib/format'
import { PageLoader, ProgressBar } from '../../components/ui'

type IconCmp = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

/** A number card with a colored icon tile, like the cards on the Budgets page. */
function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tile,
  valueClass = '',
}: {
  label: string
  value: string
  note: ReactNode
  icon: IconCmp
  tile: string
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}>
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <p className={`mt-3 text-[28px] font-bold leading-none ${valueClass}`}>{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { tracked, catById } = useUserData()

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', profile?.id],
    enabled: !!profile,
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

      return { expenses, budgets }
    },
  })

  if (isLoading) return <PageLoader />

  if (error || !data) {
    return (
      <div className="banner banner-error" role="alert">
        We could not load your dashboard. Please try again.
      </div>
    )
  }

  // ---- numbers ----
  const trackedIds = new Set(tracked.map((c) => c.id))
  const mine = data.expenses.filter((e) => trackedIds.has(e.category_id) && !e.is_archived)

  const thisKey = `${y}-${pad(m)}`
  const lastDate = new Date(y, m - 2, 1)
  const lastKey = `${lastDate.getFullYear()}-${pad(lastDate.getMonth() + 1)}`

  const thisMonth = mine.filter((e) => e.spent_on.startsWith(thisKey))
  const lastMonth = mine.filter((e) => e.spent_on.startsWith(lastKey))

  const totalExpense = sum(thisMonth)
  const lastTotal = sum(lastMonth)
  const change = lastTotal > 0 ? Math.round(((totalExpense - lastTotal) / lastTotal) * 100) : null

  const spent = spentByCategory(thisMonth)

  const budgetRows = data.budgets.filter(
    (b) => trackedIds.has(b.category_id) && (b as { is_archived?: boolean }).is_archived !== true,
  )
  const budgetTotal = sum(budgetRows)
  const budgetUsed = budgetRows.reduce((t, b) => t + (spent.get(b.category_id) ?? 0), 0)
  const remaining = budgetTotal - budgetUsed
  const usedPct = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0

  const health =
    budgetTotal === 0
      ? { label: 'No budget set', cls: 'bg-white/15 text-white' }
      : usedPct > 100
        ? { label: 'Over budget', cls: 'bg-[#fee2e2] text-[#b42318]' }
        : usedPct >= 80
          ? { label: 'Near the limit', cls: 'bg-[#fef3c7] text-[#92400e]' }
          : { label: 'On track', cls: 'bg-[#dcfce7] text-[#166534]' }

  const donut = tracked
    .map((c) => ({ name: c.name, value: spent.get(c.id) ?? 0, color: c.color }))
    .filter((d) => d.value > 0)
  const donutTotal = donut.reduce((t, d) => t + d.value, 0)

  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

    return {
      label: d.toLocaleString('en-US', { month: 'short' }),
      total: sum(mine.filter((e) => e.spent_on.startsWith(key))),
      current: i === 5,
    }
  })

  const recent = [...thisMonth].sort((a, b) => (a.spent_on < b.spent_on ? 1 : -1)).slice(0, 5)

  const first = (profile?.full_name ?? '').trim().split(' ')[0]
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {/* WELCOME */}
      <section
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3d36] via-[#0f766e] to-[#14a193] p-6 text-white sm:p-7"
        aria-label="Summary"
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-amber-300/15 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white/80">
              {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <h2 className="mt-1 text-2xl font-bold leading-tight">
              {greeting}{first ? `, ${first}` : ''}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/85">
              {budgetTotal > 0
                ? `You have spent ${peso(budgetUsed)} of your ${peso(budgetTotal)} budget this month.`
                : 'Set a monthly budget for your categories to see how much you have left.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/app/expenses"
              className="btn !border-transparent !bg-white !text-[#0f766e] hover:!bg-white/90"
            >
              <Plus size={18} aria-hidden />
              Add Expense
            </Link>
            <Link
              to="/app/budgets"
              className="btn !border-white/40 !bg-white/10 !text-white hover:!bg-white/20"
            >
              <Plus size={18} aria-hidden />
              Add Budget
            </Link>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${health.cls}`}>{health.label}</span>
            {budgetTotal > 0 && <span className="text-white/85">{Math.round(usedPct)}% of budget used</span>}
          </div>
          <div
            className="h-2.5 rounded-full bg-white/20"
            role="progressbar"
            aria-label="Budget used"
            aria-valuenow={Math.round(Math.min(usedPct, 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-2.5 rounded-full bg-white transition-all"
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Totals">
        <StatCard
          label="Total Expense"
          value={peso(totalExpense)}
          icon={TrendingDown}
          tile="bg-[#fee8ea] text-[#dc2626]"
          note={
            change === null ? (
              'Total recorded expenses this month'
            ) : (
              <span className={`inline-flex items-center gap-1 font-semibold ${change > 0 ? 'text-[#b42318]' : 'text-[#166534]'}`}>
                {change > 0 ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
                {Math.abs(change)}% {change > 0 ? 'higher' : 'lower'} than last month
              </span>
            )
          }
        />

        <StatCard
          label="Budget Remaining"
          value={budgetTotal > 0 ? peso(remaining) : '—'}
          icon={PiggyBank}
          tile="bg-[#e6f4f1] text-[#0f766e]"
          valueClass={budgetTotal > 0 ? (remaining < 0 ? 'text-danger' : 'text-brand') : ''}
          note={budgetTotal > 0 ? 'Remaining from your set budget' : 'No budget set yet'}
        />

        <StatCard
          label="Tracked Categories"
          value={String(tracked.length)}
          icon={LayoutGrid}
          tile="bg-[#eaedff] text-[#4338ca]"
          note="Number of categories you track"
        />

        <StatCard
          label="Expense Entries"
          value={String(thisMonth.length)}
          icon={Receipt}
          tile="bg-[#fff1e0] text-[#c2410c]"
          note="Number of recorded expenses this month"
        />
      </section>

      {/* CATEGORIES */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold">Your categories</h2>
          <span className="text-[13px] text-muted">Tap an icon to open that category</span>
        </div>

        <div className="card flex flex-wrap gap-5 border border-line">
          {tracked.map((c) => (
            <Link
              key={c.id}
              to={`/app/expenses?category=${c.id}`}
              aria-label={`${c.name}: ${peso(spent.get(c.id) ?? 0)} this month`}
              title={`${c.name}: ${peso(spent.get(c.id) ?? 0)} this month`}
              className="rounded-full transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <CategoryIcon category={c} size={68} />
            </Link>
          ))}

          <Link
            to="/app/settings"
            aria-label="Add category"
            title="Add category"
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-[#9aa6a1] text-muted transition hover:border-brand hover:text-brand"
          >
            <Plus size={28} aria-hidden />
          </Link>
        </div>
      </section>

      {/* CHARTS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card border border-line">
          <h2 className="text-base font-bold">Spending by category</h2>
          <p className="mb-3 text-sm text-muted">Where your money went this month.</p>

          {donut.length === 0 ? (
            <p className="py-6 text-sm text-muted">
              No expenses recorded this month yet.{' '}
              <Link to="/app/expenses" className="text-brand underline">Add an expense</Link>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative h-44 w-44" role="img" aria-label="Donut chart of spending by category">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                      {donut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => peso(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] text-muted">Total</span>
                  <span className="text-base font-bold">{peso(donutTotal)}</span>
                </div>
              </div>

              <ul className="flex min-w-[180px] flex-1 flex-col gap-2.5 text-sm">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-muted">
                      {peso(d.value)} · {Math.round((d.value / donutTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card border border-line">
          <h2 className="text-base font-bold">Monthly trend</h2>
          <p className="mb-3 text-sm text-muted">Your spending over the last six months.</p>

          <div className="h-48" role="img" aria-label="Bar chart of monthly spending">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: 'rgba(15,118,110,0.06)' }} formatter={(v) => peso(Number(v))} />
                <Bar dataKey="total" name="Spent" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {trend.map((t) => (
                    <Cell key={t.label} fill={t.current ? '#0f766e' : '#a0d3cc'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RECENT AND BUDGETS */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card overflow-x-auto border border-line">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Recent transactions</h2>
            <Link to="/app/expenses" className="text-sm text-brand underline">View all</Link>
          </div>

          {recent.length === 0 ? (
            <p className="py-4 text-sm text-muted">
              No expenses yet. <Link to="/app/expenses" className="text-brand underline">Add expense</Link>
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
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td className="td whitespace-nowrap">{shortDate(e.spent_on)}</td>
                    <td className="td">{e.note || '—'}</td>
                    <td className="td">{catById.get(e.category_id)?.name}</td>
                    <td className="td whitespace-nowrap text-right font-semibold">{peso(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card border border-line">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Budget progress</h2>
            <Link to="/app/budgets" className="text-sm text-brand underline">Manage</Link>
          </div>

          {budgetRows.length === 0 ? (
            <p className="text-sm text-muted">
              No budgets yet. <Link to="/app/budgets" className="text-brand underline">Set a budget</Link>
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {budgetRows.map((b) => {
                const c = catById.get(b.category_id)
                const s = spent.get(b.category_id) ?? 0
                const pct = (s / b.amount) * 100

                return (
                  <div key={b.id} className="text-sm">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-medium">
                        {c && <CategoryIcon category={c} size={24} />}
                        {c?.name}
                      </span>
                      <span className="text-muted">{peso(s)} / {peso(b.amount)}</span>
                    </div>
                    <ProgressBar percent={pct} />
                    {pct >= 100 ? (
                      <div className="mt-1.5 text-[13px] font-medium text-danger">Over budget</div>
                    ) : pct >= 80 ? (
                      <div className="mt-1.5 text-[13px] text-[#b45309]">Warning: near the 100% limit</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}