
import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

export function RequireGuest() {
  const { session, profile, loading } = useAuth()
  const checked = useRef(false)
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (loading || checked.current) return

    checked.current = true

    if (!session || profile?.status !== 'active') return

    setTarget(profile.role === 'admin' ? '/admin' : '/app')
  }, [loading, session, profile])

  if (loading) return <PageLoader />

  if (target) return <Navigate to={target} replace />

  return <Outlet />
}

export function RequireRole({
  role,
}: {
  role: 'user' | 'admin'
}) {
  const { session, profile, loading, signOut } = useAuth()

  // Show the animated transition while authentication is being verified.
  if (loading) {
    return <PageLoader />
  }

  // Redirect unauthenticated users.
  if (!session) {
    return (
      <Navigate
        to={role === 'admin' ? '/login?mode=admin' : '/login'}
        replace
      />
    )
  }

  // Handle missing profiles.
  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-10">
        <div className="banner banner-error" role="alert">
          We could not load your account. Log out and try again.
        </div>

        <button
          className="btn mt-4"
          onClick={() => void signOut()}
        >
          Log out
        </button>
      </div>
    )
  }

  // Handle suspended accounts.
  if (profile.status === 'suspended') {
    return (
      <div className="mx-auto max-w-md p-10">
        <div className="banner banner-error" role="alert">
          Your account is suspended. Contact the administrator.
        </div>

        <button
          className="btn mt-4"
          onClick={() => void signOut()}
        >
          Log out
        </button>
      </div>
    )
  }

  // Handle other inactive accounts.
  if (profile.status !== 'active') {
    return (
      <div className="mx-auto max-w-md p-10">
        <div className="banner banner-error" role="alert">
          Your account is not active. Contact the administrator.
        </div>

        <button
          className="btn mt-4"
          onClick={() => void signOut()}
        >
          Log out
        </button>
      </div>
    )
  }

  // Prevent users from accessing the wrong role's dashboard.
  if (profile.role !== role) {
    return (
      <Navigate
        to={profile.role === 'admin' ? '/admin' : '/forbidden'}
        replace
      />
    )
  }

  return <Outlet />
}
