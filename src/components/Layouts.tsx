import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { UserDataProvider, useUserData } from '../context/UserData'
import { CategoryPicker } from './CategoryPicker'
import { PageLoader } from './ui'

const USER_NAV = [
  ['/app', 'Dashboard', true],
  ['/app/budgets', 'Budgets', false],
  ['/app/expenses', 'Expenses', false],
  ['/app/reports', 'Reports', false],
  ['/app/learn', 'Financial Literacy', false],
  ['/app/archive', 'Archive', false],
  ['/app/settings', 'Settings', false],
] as const

const ADMIN_NAV = [
  ['/admin', 'Overview', true],
  ['/admin/users', 'Users', false],
  ['/admin/categories', 'Default categories', false],
  ['/admin/reports', 'Reports', false],
  ['/admin/audit', 'Audit log', false],
] as const

function Shell({ nav, admin }: { nav: readonly (readonly [string, string, boolean])[]; admin?: boolean }) {
  const { profile, signOut } = useAuth()
  return (
    <div className={`flex min-h-screen flex-col md:flex-row ${admin ? 'theme-admin' : ''}`} style={{ background: 'var(--canvas)' }}>
      <aside className={`flex shrink-0 flex-col gap-1.5 px-3.5 py-5 text-[#c9d8d3] md:w-56 ${admin ? 'bg-admin-side' : 'bg-side'}`}>
        <div className="px-3.5 pb-2 text-lg font-bold leading-snug text-white">
          Track Mo, Pake ko!
          {admin && <div className="text-xs font-normal text-[#b7bdd6]">Admin console</div>}
        </div>
        <nav aria-label="Main" className="flex gap-1.5 overflow-x-auto md:flex-col">
          {nav.map(([to, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm ${isActive ? 'bg-[var(--accent)] font-semibold text-white' : 'hover:bg-white/10'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden px-3.5 pt-8 text-[13px] md:block">
          Signed in as
          <div className="font-bold text-white">{profile?.full_name || profile?.email}</div>
          <button onClick={() => void signOut()} className="mt-3 inline-flex items-center gap-2 rounded-lg px-0 py-1 text-[#c9d8d3] hover:text-white">
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <Outlet />
        </div>
        <button onClick={() => void signOut()} className="btn mt-8 md:hidden"><LogOut size={16} aria-hidden /> Log out</button>
      </main>
    </div>
  )
}

function UserGate() {
  const { loading, trackedIds } = useUserData()
  if (loading) return <PageLoader />
  return (
    <>
      <Shell nav={USER_NAV} />
      {trackedIds.size === 0 && <CategoryPicker />}
    </>
  )
}

export function UserLayout() {
  return (
    <UserDataProvider>
      <UserGate />
    </UserDataProvider>
  )
}

export function AdminLayout() {
  return <Shell nav={ADMIN_NAV} admin />
}
