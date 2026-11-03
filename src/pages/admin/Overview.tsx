import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CategoryIcon } from '../../lib/icons'
import { PageLoader, PageTitle } from '../../components/ui'
import { downloadCsv } from '../../lib/format'
import type { Category } from '../../lib/types'
import { AccountList } from './AccountList'
import { AddAdminButton } from './AddAdmin'

export default function Overview() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_stats')
      if (error) throw error
      return (data as { total_users: number; active_users: number; admins: number; expenses_count: number }[])[0]
    },
  })
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
  if (stats.isLoading || cats.isLoading) return <PageLoader />
  const s = stats.data

  return (
    <>
      <PageTitle title="Overview">
        <button className="btn btn-primary" onClick={() => s && downloadCsv('trackmo-pakeko-system-report.csv', [['Registered users', 'Active users', 'Admins', 'Expenses logged'], [s.total_users, s.active_users, s.admins, s.expenses_count]])}>Export system report</button>
      </PageTitle>
      {stats.error && <div className="banner banner-error" role="alert">We could not load the numbers. Try again.</div>}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Registered users', s?.total_users], ['Active users', s?.active_users], ['Admins', s?.admins], ['Expenses logged', s?.expenses_count]].map(([l, v]) => (
          <div key={l as string} className="card"><div className="text-[13px] text-muted">{l}</div><div className="mt-1 text-[26px] font-bold">{v ?? '-'}</div></div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="card"><h2 className="mb-2 text-base font-bold">Users</h2><AccountList role="user" /></div>
          <div className="card">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-bold">Admins</h2><AddAdminButton /></div>
            <AccountList role="admin" />
          </div>
        </div>
        <div className="card h-fit">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Default categories</h2><Link to="/admin/categories" className="btn !h-9">+ Add</Link></div>
          <ul className="flex flex-col gap-2.5">
            {(cats.data ?? []).filter((c) => c.is_active).slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <CategoryIcon category={c} size={40} />
                <span className="flex-1 text-sm">{c.name}</span>
                <Link to="/admin/categories" className="icon-btn" aria-label={`Edit ${c.name}`} title="Edit"><Pencil size={18} aria-hidden /></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
