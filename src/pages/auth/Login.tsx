
import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SESSION_FLAG } from '../../context/AuthContext'
import { Field } from '../../components/ui'
import { AuthShell, RoleToggle } from './AuthShell'
import type { Profile } from '../../lib/types'

const LOCK_KEY = 'tmpk_login_lock'
const MAX_TRIES = 5
const LOCK_MS = 1 * 60 * 1000

const userSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
})

type UserForm = z.infer<typeof userSchema>
type AdminForm = UserForm

function readLock() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) ?? '{}') as {
      tries?: number
      until?: number
    }
  } catch {
    return {}
  }
}

export default function Login() {
  const [params, setParams] = useSearchParams()
  const mode: 'user' | 'admin' = params.get('mode') === 'admin' ? 'admin' : 'user'
  const nav = useNavigate()

  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Navigation protection only. Does not affect form validation.
  const blocker = useBlocker(({ historyAction, nextLocation }) => {
    if (historyAction !== 'POP') return false

    const goingToAdminLogin =
      nextLocation.pathname === '/login' &&
      new URLSearchParams(nextLocation.search).get('mode') === 'admin'

    const goingToUserForgotPassword =
      mode === 'user' &&
      nextLocation.pathname === '/forgot-password'

    return mode === 'admin' || goingToAdminLogin || goingToUserForgotPassword
  })

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker.state, blocker.reset])

  // User login form
  const uf = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  // Admin login form
  const af = useForm<AdminForm>({
    resolver: zodResolver(userSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.removeItem(SESSION_FLAG)
      setBanner('Your session has ended. Log in again.')
    }
  }, [])

  // NOTE: the "already logged in, so leave this page" check lives in
  // RequireGuest (components/Guards.tsx), so it is not repeated here.

  const locked = () => {
    const l = readLock()
    return !!l.until && l.until > Date.now()
  }

  const fail = (msg: string) => {
    const l = readLock()
    const tries = (l.tries ?? 0) + 1

    if (tries >= MAX_TRIES) {
      localStorage.setItem(LOCK_KEY, JSON.stringify({ tries: 0, until: Date.now() + LOCK_MS }))
      setBanner('Too many attempts. Try again in 1 minutes.')
    } else {
      localStorage.setItem(LOCK_KEY, JSON.stringify({ tries, until: 0 }))
      setBanner(`${msg} ${MAX_TRIES - tries} attempts left.`)
    }
  }

  const ok = () => {
    localStorage.removeItem(LOCK_KEY)
  }

  // Signs in and loads the profile.
  const signIn = async (
    email: string,
    password: string,
    wanted: 'user' | 'admin',
    generic: string,
  ): Promise<Profile | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      fail(generic)
      return null
    }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    const prof = p as Profile | null

    // Wrong door (for example an admin using the user form): same message as a wrong password.
    if (!prof || prof.role !== wanted) {
      await supabase.auth.signOut()
      fail(generic)
      return null
    }

    if (prof.status === 'suspended') {
      await supabase.auth.signOut()
      setBanner('Your account is suspended. Contact the administrator.')
      return null
    }

    if (prof.status !== 'active') {
      await supabase.auth.signOut()
      setBanner('Your account is not active. Contact the administrator.')
      return null
    }

    return prof
  }

  const GENERIC = 'Incorrect email or password. Please check your credentials and try again.'

  // User login
  const onUser = async (v: UserForm) => {
    setBanner('')

    if (locked()) {
      return setBanner('Too many attempts. Please try again in 1 minute.')
    }

    setBusy(true)
    const prof = await signIn(v.email, v.password, 'user', GENERIC)
    setBusy(false)

    if (prof) {
      ok()
      nav('/app', { replace: true })
    }
  }

  // Admin login using email and password only.
  const onAdmin = async (v: AdminForm) => {
    setBanner('')

    if (locked()) {
      return setBanner('Too many attempts. Please try again in 1 minute.')
    }

    setBusy(true)
    const prof = await signIn(v.email, v.password, 'admin', GENERIC)
    setBusy(false)

    if (prof) {
      ok()
      nav('/admin', { replace: true })
    }
  }

  const setMode = (m: 'user' | 'admin') => {
    setBanner('')
    uf.reset()
    af.reset()
    setShowUserPassword(false)
    setShowAdminPassword(false)

    // replace: true, so switching the toggle does not add a history entry for Back to return to.
    setParams(m === 'admin' ? { mode: 'admin' } : {}, { replace: true })
  }

  // Same red border on every form: the shared "input-bad" style from index.css.
  const bad = (e?: unknown) => (e ? 'input-bad' : '')

  return (
    <AuthShell
      admin={mode === 'admin'}
      title={mode === 'admin' ? 'Admin ' : 'Welcome back'}
      text={
        mode === 'admin'
          ? 'For authorized administrators only. Manage users, default categories and reports.'
          : 'Log in to see where your money went this month and stay on top of your budgets.'
      }
      corner={<RoleToggle mode={mode} onChange={setMode} />}
    >
      {mode === 'user' ? (
        <form className="card flex flex-col gap-3.5 !p-7" onSubmit={uf.handleSubmit(onUser)} noValidate>
          <h2 className="text-[22px] font-bold">User log in</h2>

          {banner && <div className="banner banner-error" role="alert">{banner}</div>}

          <Field label="Email" htmlFor="email" error={uf.formState.errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!uf.formState.errors.email}
              className={`input ${bad(uf.formState.errors.email)}`}
              {...uf.register('email', { onChange: () => setBanner('') })}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={uf.formState.errors.password?.message}>
            <div className="relative">
              <input
                id="password"
                type={showUserPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!uf.formState.errors.password}
                className={`input !pr-11 ${bad(uf.formState.errors.password)}`}
                {...uf.register('password')}
              />

              <button
                type="button"
                onClick={() => setShowUserPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                aria-label={showUserPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showUserPassword}
              >
                {showUserPassword ? (
                  <EyeOff size={20} aria-hidden />
                ) : (
                  <Eye size={20} aria-hidden />
                )}
              </button>
            </div>
          </Field>

          <div className="text-right text-sm">
            <Link to="/forgot-password" className="text-brand underline">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary !h-[46px]" disabled={busy}>
            {busy ? 'Logging in...' : 'Log in'}
          </button>

          <div className="text-center text-sm text-muted">
            New here? <Link to="/signup" className="text-brand underline">Create an account</Link>
          </div>
        </form>
      ) : (
        <form className="card flex flex-col gap-3.5 !p-7" onSubmit={af.handleSubmit(onAdmin)} noValidate>
          <h2 className="text-[22px] font-bold">Admin log in</h2>

          {banner && <div className="banner banner-error" role="alert">{banner}</div>}

          <Field label="Admin email" htmlFor="aemail" error={af.formState.errors.email?.message}>
            <input
              id="aemail"
              type="email"
              autoComplete="username"
              aria-invalid={!!af.formState.errors.email}
              className={`input ${bad(af.formState.errors.email)}`}
              {...af.register('email', { onChange: () => setBanner('') })}
            />
          </Field>

          <Field label="Password" htmlFor="apassword" error={af.formState.errors.password?.message}>
            <div className="relative">
              <input
                id="apassword"
                type={showAdminPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!af.formState.errors.password}
                className={`input !pr-11 ${bad(af.formState.errors.password)}`}
                {...af.register('password')}
              />

              <button
                type="button"
                onClick={() => setShowAdminPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showAdminPassword}
              >
                {showAdminPassword ? (
                  <EyeOff size={20} aria-hidden />
                ) : (
                  <Eye size={20} aria-hidden />
                )}
              </button>
            </div>
          </Field>

          <div className="text-right text-sm">
            {/* state.fromLogin lets the forgot password page know it was opened by this click. */}
            <Link
              to="/admin/forgot-password"
              state={{ fromLogin: true }}
              className="text-admin underline"
            >
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary !h-[46px]" disabled={busy}>
            {busy ? 'Logging in...' : 'Log in to admin '}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
