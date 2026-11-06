
import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
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
        className="card flex flex-col gap-3.5 !p-7"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <h2 className="text-[22px] font-bold">Log in</h2>

        {banner && (
          <div className="banner banner-error" role="alert">
            {banner}
          </div>
        )}

        <Field
          label="Email"
          htmlFor="email"
          error={form.formState.errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!form.formState.errors.email}
            className={`input ${bad(form.formState.errors.email)}`}
            {...form.register('email', {
              onChange: () => setBanner(''),
            })}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
        >
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              className={`input !pr-11 ${bad(form.formState.errors.password)}`}
              {...form.register('password')}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff size={20} aria-hidden />
              ) : (
                <Eye size={20} aria-hidden />
              )}
            </button>
          </div>
        </Field>

        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-brand underline">
            Forgot password?
          </Link>
        </div>

      <button
  type="submit"
  className="btn btn-primary !h-[46px] flex items-center justify-center gap-2"
  disabled={busy}
>
  {busy && (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  )}
  <span>{busy ? 'Please wait' : 'Log in'}</span>
</button>

        <div className="text-center text-sm text-muted">
          New here?{' '}
          <Link to="/signup" className="text-brand underline">
            Create an account
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
