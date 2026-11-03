import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Activity, FileText, Receipt, Sheet, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CategoryIcon } from '../../lib/icons'
import { downloadCsv, monthStart, nextMonthStart } from '../../lib/format'
import { PageLoader, PageTitle } from '../../components/ui'
import type { Category } from '../../lib/types'

export default function Reports() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const [period, setPeriod] = useState<'this' | 'last' | 'year'>('this')
  const [start, end] =
    period === 'this' ? [monthStart(y, m), nextMonthStart(y, m)]
    : period === 'last' ? [monthStart(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1), monthStart(y, m)]
    : [`${y}-01-01`, `${y + 1}-01-01`]

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-report', start, end],
    queryFn: async () => {
      const [s, t, g, c] = await Promise.all([
        supabase.rpc('admin_period_stats', { p_start: start, p_end: end }),
        supabase.rpc('admin_top_categories', { p_start: start, p_end: end }),
        supabase.rpc('admin_user_growth'),
        supabase.from('categories').select('*'),
      ])
      const fail = s.error || t.error || g.error || c.error
      if (fail) throw fail
      return {
        stats: (s.data as { new_users: number; expenses_count: number; active_users: number }[])[0],
        top: t.data as { category_id: number; uses: number }[],
        growth: g.data as { label: string; total: number }[],
        cats: new Map((c.data as Category[]).map((x) => [x.id, x])),
      }
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !data) return <div className="banner banner-error" role="alert">We could not create the report. Try again.</div>

  const cards = [
    { label: 'New users', value: data.stats.new_users, icon: Users },
    { label: 'Expenses recorded', value: data.stats.expenses_count, icon: Receipt },
    { label: 'Active users', value: data.stats.active_users, icon: Activity },
  ]

  return (
    <>
      <PageTitle title="System reports">
        <select aria-label="Period" className="input !w-44" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
          <option value="this">This month</option><option value="last">Last month</option><option value="year">This year</option>
        </select>
        <button className="icon-btn !h-11 !w-11 !border-admin !bg-admin !text-white" aria-label="Print or save as PDF" title="Print or save as PDF" onClick={() => window.print()}><FileText size={20} aria-hidden /></button>
        <button className="icon-btn !h-11 !w-11" aria-label="Download CSV" title="Download CSV" onClick={() => downloadCsv(`trackmo-pakeko-system-${start}.csv`, [['Metric', 'Value'], ...cards.map((c) => [c.label, c.value])])}><Sheet size={20} aria-hidden /></button>
      </PageTitle>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-2.5 text-[13px] text-muted"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef0fb] text-admin"><Icon size={18} aria-hidden /></span>{label}</div>
            <div className="mt-2 text-[26px] font-bold">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <h2 className="mb-3 text-base font-bold">User growth</h2>
          <div className="h-44" role="img" aria-label="Line chart of total users over six months">
            <ResponsiveContainer>
              <LineChart data={data.growth}>
                <CartesianGrid vertical={false} stroke="#e4e6ee" />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="mb-2 text-base font-bold">Most used categories</h2>
          {data.top.length === 0 ? <p className="text-sm text-muted">No data for the selected period.</p> : (
            data.top.map((t, i) => {
              const c = data.cats.get(t.category_id)
              return (
                <div key={t.category_id} className="flex items-center justify-between border-t border-[#e4e6ee] py-3 first:border-t-0">
                  {c && <CategoryIcon category={c} size={44} />}
                  <b className="text-sm">{['1st', '2nd', '3rd'][i]}</b>
                </div>
              )
            })
          )}
        </div>
      </section>
    </>
  )
}
