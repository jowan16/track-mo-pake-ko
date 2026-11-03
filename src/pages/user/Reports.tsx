
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FileText, Sheet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { CategoryIcon } from '../../lib/icons'
import {
  fetchBudgets,
  fetchExpenses,
  spentByCategory,
  sum,
} from '../../lib/queries'
import {
  monthStart,
  nextMonthStart,
  pad,
  peso,
} from '../../lib/format'
import { PageLoader, PageTitle } from '../../components/ui'

export default function Reports() {
  const { profile } = useAuth()
  const { tracked, catById } = useUserData()
  const [mode, setMode] = useState<'monthly' | 'yearly'>('monthly')

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const { data, isLoading } = useQuery({
    queryKey: ['report', profile?.id, mode, y, m],
    enabled: !!profile,
    queryFn: async () => {
      const start =
        mode === 'monthly'
          ? m === 1
            ? `${y - 1}-12-01`
            : monthStart(y, m - 1)
          : `${y - 1}-01-01`

      const end =
        mode === 'monthly'
          ? nextMonthStart(y, m)
          : `${y + 1}-01-01`

      const [expenses, budgets] = await Promise.all([
        fetchExpenses(start, end, profile!.id),
        fetchBudgets(m, y, profile!.id),
      ])

      return { expenses, budgets }
    },
  })

  if (isLoading || !data) return <PageLoader />

  const ids = new Set(tracked.map((c) => c.id))
  const all = data.expenses.filter((e) =>
    ids.has(e.category_id)
  )

  const prevKey =
    m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
  const curKey = `${y}-${pad(m)}`

  let cur: typeof all
  let prev: typeof all
  let chart: { label: string; total: number }[]

  if (mode === 'monthly') {
    cur = all.filter((e) => e.spent_on.startsWith(curKey))
    prev = all.filter((e) => e.spent_on.startsWith(prevKey))

    const days = new Date(y, m, 0).getDate()

    chart = Array.from({ length: days }, (_, i) => ({
      label: String(i + 1),
      total: sum(
        cur.filter(
          (e) => Number(e.spent_on.slice(8)) === i + 1
        )
      ),
    }))
  } else {
    cur = all.filter((e) =>
      e.spent_on.startsWith(String(y))
    )

    prev = all.filter((e) =>
      e.spent_on.startsWith(String(y - 1))
    )

    chart = Array.from({ length: 12 }, (_, i) => ({
      label: new Date(y, i, 1).toLocaleString('en-US', {
        month: 'short',
      }),
      total: sum(
        cur.filter((e) =>
          e.spent_on.startsWith(`${y}-${pad(i + 1)}`)
        )
      ),
    }))
  }

  const total = sum(cur)
  const prevTotal = sum(prev)

  const change =
    prevTotal > 0
      ? Math.round(((total - prevTotal) / prevTotal) * 100)
      : null

  const byCat = spentByCategory(cur)

  const top = [...byCat.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]

  const topCat = top ? catById.get(top[0]) : undefined

  const periodName =
    mode === 'monthly' ? 'last month' : 'last year'

  const insights: string[] = []

  if (topCat) {
    insights.push(`${topCat.name} is your largest expense.`)
  }

  if (change !== null) {
    insights.push(
      change >= 0
        ? `Spending rose ${change}% compared with ${periodName}.`
        : `Spending fell ${Math.abs(change)}% compared with ${periodName}.`
    )
  }

  data.budgets.forEach((b) => {
    const c = catById.get(b.category_id)
    const s = byCat.get(b.category_id) ?? 0

    if (mode === 'monthly' && c && s / b.amount < 0.5) {
      insights.push(`${c.name} is well under budget.`)
    }
  })

  return (
    <>
      <PageTitle title="Reports">
        <button
          className={`btn ${mode === 'monthly' ? 'btn-primary' : ''}`}
          aria-pressed={mode === 'monthly'}
          onClick={() => setMode('monthly')}
        >
          Monthly
        </button>

        <button
          className={`btn ${mode === 'yearly' ? 'btn-primary' : ''}`}
          aria-pressed={mode === 'yearly'}
          onClick={() => setMode('yearly')}
        >
          Yearly
        </button>

        <button
          type="button"
          className="icon-btn !h-11 !w-11"
          aria-label="Print or save as PDF"
          title="Print or save as PDF"
          onClick={() => window.print()}
        >
          <FileText size={20} aria-hidden />
        </button>

        <Link
          to="/app/reports/export"
          className="icon-btn !h-11 !w-11"
          aria-label="CSV reports"
          title="CSV reports"
        >
          <Sheet size={20} aria-hidden />
        </Link>
      </PageTitle>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-[13px] text-muted">
            Total spent
          </div>
          <div className="mt-1 text-[26px] font-bold">
            {peso(total)}
          </div>
        </div>

        <div className="card">
          <div className="text-[13px] text-muted">
            Vs. {mode === 'monthly' ? 'last month' : 'last year'}
          </div>
          <div
            className={`mt-1 text-[26px] font-bold ${
              change !== null && change > 0
                ? 'text-[#9a3412]'
                : ''
            }`}
          >
            {change === null
              ? 'No data'
              : `${change > 0 ? '+' : ''}${change}%`}
          </div>
        </div>

        <div className="card">
          <div className="text-[13px] text-muted">
            Top category
          </div>
          <div className="mt-1">
            {topCat ? (
              <CategoryIcon category={topCat} size={44} />
            ) : (
              <span className="text-sm text-muted">
                No data
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <h2 className="mb-3 text-base font-bold">
            {mode === 'monthly'
              ? 'Spending over the month'
              : 'Spending over the year'}
          </h2>

          <div
            className="h-48"
            role="img"
            aria-label="Line chart of spending"
          >
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid
                  vertical={false}
                  stroke="#e4e8e5"
                />
                <XAxis
                  dataKey="label"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(v) => peso(Number(v))}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-base font-bold">
            Insights
          </h2>

          {insights.length === 0 ? (
            <p className="text-sm text-muted">
              Add expenses to see insights.
            </p>
          ) : (
            <ul className="list-disc pl-5 text-sm leading-7">
              {insights.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
