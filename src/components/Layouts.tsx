
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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

const USER_PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/app': {
    title: 'Dashboard',
    subtitle: 'Manage and monitor your Track Mo system.',
  },
  '/app/budgets': {
    title: 'Budgets',
    subtitle: 'Manage and monitor your budgets.',
  },
  '/app/expenses': {
    title: 'Expenses',
    subtitle: 'Track and manage your daily expenses.',
  },
  '/app/reports': {
    title: 'Reports',
    subtitle: 'Review and monitor your financial activities.',
  },
  '/app/reports/export': {
    title: 'Export Reports',
    subtitle: 'Export and download your financial reports.',
  },
  '/app/learn': {
    title: 'Financial Literacy',
    subtitle: 'Learn how to manage your money and build better financial habits.',
  },
  '/app/archive': {
    title: 'Archive',
    subtitle: 'View and manage your archived records.',
  },
  '/app/settings': {
    title: 'Settings',
    subtitle: 'Manage your account and application preferences.',
  },
}

function getUserPageMeta(pathname: string) {
  if (pathname.startsWith('/app/learn/')) {
    return {
      title: 'Financial Literacy',
      subtitle: 'Explore lessons and improve your financial knowledge.',
    }
  }

  return USER_PAGE_META[pathname] ?? {
    title: 'Dashboard',
    subtitle: 'Manage and monitor your Track Mo system.',
  }
}

function Shell({
  nav,
  admin,
}: {
  nav: readonly (readonly [string, string, boolean])[]
  admin?: boolean
}) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const pageMeta = getUserPageMeta(location.pathname)

  return (
    <div
      className={`flex min-h-screen flex-col md:flex-row ${
        admin ? 'theme-admin' : ''
      }`}
      style={{ background: 'var(--canvas)' }}
    >
      <aside
        className={`flex shrink-0 flex-col gap-1.5 px-3.5 py-5 text-[#c9d8d3] md:sticky md:top-0 md:h-screen md:self-start ${
          admin ? 'bg-admin-side' : 'bg-side'
        }`}
      >
        <div className="px-3.5 pb-2 text-lg font-bold leading-snug text-white">
          Track Mo, Pake ko!
          {admin && (
            <div className="text-xs font-normal text-[#b7bdd6]">
              Admin console
            </div>
          )}
        </div>

        <nav
          aria-label="Main"
          className="flex gap-1.5 overflow-x-auto md:flex-col"
        >
          {nav.map(([to, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm ${
                  isActive
                    ? 'bg-[var(--accent)] font-semibold text-white'
                    : 'hover:bg-white/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Account section stays at the bottom of the sidebar */}
        <div className="mt-auto hidden px-3.5 pt-8 text-[13px] md:block">
          Signed in as
          <div className="break-words font-bold text-white">
            {profile?.full_name || profile?.email}
          </div>

          <button
            onClick={() => void signOut()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-0 py-1 text-[#c9d8d3] hover:text-white"
          >
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {!admin && (
          <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-slate-800">
                {pageMeta.title}
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {pageMeta.subtitle}
              </p>
            </div>

            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              User
            </span>
          </header>
        )}

        <div className="p-5 sm:p-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <Outlet />
          </div>

          <button
            onClick={() => void signOut()}
            className="btn mt-8 md:hidden"
          >
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
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
