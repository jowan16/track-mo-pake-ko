import { useState } from 'react'
import { PageTitle } from '../../components/ui'
import { AccountList } from './AccountList'
import { AddAdminButton } from './AddAdmin'

export default function Users() {
  const [search, setSearch] = useState('')
  return (
    <>
      <PageTitle title="Users">
        <span className="text-[13px] text-muted">Users create their own accounts on the Sign up page.</span>
        <AddAdminButton primary />
      </PageTitle>
      <section className="card">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Users</h2>
          <input aria-label="Search users" placeholder="Search by name or email" className="input !w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <AccountList role="user" search={search} showEmail />
      </section>
      <section className="card">
        <h2 className="mb-2 text-base font-bold">Admins</h2>
        <AccountList role="admin" search={search} showEmail />
      </section>
    </>
  )
}
