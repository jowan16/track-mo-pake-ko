import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageLoader, PageTitle } from '../../components/ui'
import type { AuditRow } from '../../lib/types'

export default function Audit() {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      const { data: rows, error: e } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
      if (e) throw e
      return rows as AuditRow[]
    },
  })
  if (isLoading) return <PageLoader />
  if (error) return <div className="banner banner-error" role="alert">We could not load the audit log. Try again.</div>

  const rows = (data ?? []).filter((r) => {
    const text = `${r.actor_name} ${r.action}`.toLowerCase()
    const okKind = kind === 'all' || (kind === 'users' ? /user|admin|password/i.test(r.action) : /categor/i.test(r.action))
    return okKind && text.includes(search.toLowerCase())
  })
  const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <>
      <PageTitle title="Audit log" sub="Audit entries cannot be edited or deleted." />
      <section className="card overflow-x-auto">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <input aria-label="Search actions or admins" placeholder="Search actions or admins" className="input !w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select aria-label="Filter" className="input !w-44" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All actions</option><option value="users">User changes</option><option value="categories">Categories</option>
          </select>
        </div>
        <table className="w-full">
          <thead><tr><th className="th">Time</th><th className="th">Admin</th><th className="th">Action</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="td text-muted">No entries yet.</td></tr>}
            {rows.map((r) => <tr key={r.id}><td className="td whitespace-nowrap">{when(r.created_at)}</td><td className="td">{r.actor_name}</td><td className="td">{r.action}</td></tr>)}
          </tbody>
        </table>
      </section>
    </>
  )
}
