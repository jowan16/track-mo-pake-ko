
import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SESSION_FLAG } from '../../context/AuthContext'
import { Field } from '../../components/ui'
import { AuthShell } from './AuthShell'
import type { Profile } from '../../lib/types'

const LOCK_KEY = 'tmpk_login_lock'
const MAX_TRIES = 5
const LOCK_MINUTES = 1 // Change to 15 after testing
const LOCK_MS = LOCK_MINUTES * 60 * 1000

const LOCK_TEXT = `Too many attempts. Please try again in ${LOCK_MINUTES} minute${LOCK_MINUTES > 1 ? 's' : ''}.`

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
})

type LoginForm = z.infer<typeof loginSchema>

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
  const nav = useNavigate()

  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Prevent browser Back from returning to protected or previous auth pages.
  const blocker = useBlocker(({ historyAction }) => {
    return historyAction === 'POP'
  })

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker.state, blocker.reset])

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.removeItem(SESSION_FLAG)
      setBanner('Your session has ended. Log in again.')
    }
  }, [])

  const locked = () => {
    const lock = readLock()
    return !!lock.until && lock.until > Date.now()
  }

  const fail = (message: string) => {
    const lock = readLock()
    const tries = (lock.tries ?? 0) + 1

    if (tries >= MAX_TRIES) {
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          tries: 0,
          until: Date.now() + LOCK_MS,
        })
      )

      setBanner(LOCK_TEXT)
    } else {
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          tries,
          until: 0,
        })
      )

      setBanner(`${message} ${MAX_TRIES - tries} attempts left.`)
    }
  }

  const clearLock = () => {
    localStorage.removeItem(LOCK_KEY)
  }

  const GENERIC_ERROR =
    'Incorrect email or password. Please check your credentials and try again.'

  const onSubmit = async (values: LoginForm) => {
    setBanner('')

    if (locked()) {
      setBanner(LOCK_TEXT)
      return
    }

    setBusy(true)

    try {
      // Authenticate the account through Supabase.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error || !data.user) {
        fail(GENERIC_ERROR)
        return
      }

      // Retrieve the authenticated user's profile and role.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        fail(GENERIC_ERROR)
        return
      }

      const profile = profileData as Profile

      // The role must come from the database, not from the login form.
      if (profile.role !== 'user' && profile.role !== 'admin') {
        await supabase.auth.signOut()
        fail(GENERIC_ERROR)
        return
      }

      if (profile.status === 'suspended') {
        await supabase.auth.signOut()
        setBanner('Your account is suspended. Contact the administrator.')
        return
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut()
        setBanner('Your account is not active. Contact the administrator.')
        return
      }

      // Successful login.
      clearLock()

      // Redirect according to the database role.
      if (profile.role === 'admin') {
        nav('/admin', { replace: true })
      } else {
        nav('/app', { replace: true })
      }
    } catch {
      setBanner('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const bad = (error?: unknown) => (error ? 'input-bad' : '')

  return (
    <AuthShell
      admin={false}
      title="Welcome back"
      text="Log in to see where your money went this month and stay on top of your budgets."
      open={true}
      onClose={() => {}}
    >
           <form
        className="card flex flex-col gap-4 !p-8"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {/* HEADER (extra right space so the close button never overlaps it) */}
        <div className="flex items-center gap-3.5 pr-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-emerald-500 text-xl font-bold text-[#0a211c] shadow-md shadow-teal-900/20">
            ₱
          </span>

          <div>
            <h2 className="text-[22px] font-bold leading-tight">Welcome back</h2>
            <p className="mt-0.5 text-sm text-muted">
              Log in to continue to Track Mo, Pake ko!
            </p>
          </div>
        </div>

        {banner && (
          <div className="banner banner-error" role="alert">
            {banner}
          </div>
        )}

        {/* EMAIL */}
        <Field
          label="Email"
          htmlFor="email"
          error={form.formState.errors.email?.message}
        >
          <div className="relative">
            <Mail
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!form.formState.errors.email}
              className={`input !h-12 !pl-10 ${bad(form.formState.errors.email)}`}
              {...form.register('email', {
                onChange: () => setBanner(''),
              })}
            />
          </div>
        </Field>

        {/* PASSWORD */}
        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
        >
          <div className="relative">
            <Lock
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!form.formState.errors.password}
              className={`input !h-12 !pl-10 !pr-12 ${bad(form.formState.errors.password)}`}
              {...form.register('password', {
                onChange: () => setBanner(''),
              })}
            />

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-gray-100 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        <div className="-mt-1 text-right text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* LOG IN BUTTON */}
        <button
          type="submit"
          className="btn btn-primary !h-12 text-[15px] shadow-md shadow-teal-900/20"
          disabled={busy}
        >
          {busy ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Logging in...
            </>
          ) : (
            <>
              Log in
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>

        {/* CREATE ACCOUNT */}
        <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          New to Track Mo?
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link to="/signup" className="btn !h-11 w-full">
          Create an account
        </Link>

       
      </form>
    </AuthShell>
  )
}
