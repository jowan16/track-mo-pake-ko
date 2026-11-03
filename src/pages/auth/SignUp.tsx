
import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Field } from '../../components/ui'
import { AuthShell } from './AuthShell'

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters and include a letter and a number.')
  .regex(/[A-Za-z]/, 'Password must be at least 8 characters and include a letter and a number.')
  .regex(/\d/, 'Password must be at least 8 characters and include a letter and a number.')

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name.').max(60, 'Name is too long (60 characters max).'),
    email: z.string().trim().min(1, 'Enter a valid email address.').email('Enter a valid email address.'),
    password: passwordRule,
    confirm: z.string().min(1, 'Passwords do not match.'),
    terms: z.boolean().refine((v) => v, 'You must accept the terms to continue.'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  })

type Form = z.infer<typeof schema>

export default function SignUp() {
  const nav = useNavigate()

  const [banner, setBanner] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // Independent password visibility controls.
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Block browser Back and Forward while on Sign Up.
  const blocker = useBlocker(
    ({ historyAction }) => historyAction === 'POP'
  )

  // Cancel blocked browser navigation and remain on Sign Up.
  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker.state, blocker.reset])

  // Intentionally navigate to Login and replace Sign Up in history.
  const goToLogin = () => {
    nav('/login', { replace: true })
  }

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      terms: false,
    },
  })

  const onSubmit = async (v: Form) => {
    setBanner('')
    setBusy(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          data: {
            full_name: v.name,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        if (/registered|exists/i.test(error.message)) {
          setError('email', {
            message: 'This email is already registered. Log in instead.',
          })
          return
        }

        setBanner(error.message)
        return
      }

      if (data.user && data.user.identities?.length === 0) {
        setError('email', {
          message: 'This email is already registered. Log in instead.',
        })
        return
      }

      if (data.session) {
        nav('/app', { replace: true })
        return
      }

      setDone(true)
    } catch {
      setBanner('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const cls = (e?: unknown) => `input ${e ? 'input-bad' : ''}`

  return (
    <AuthShell
      title="Start tracking today"
      text="Create a free account to record expenses, set budgets and see simple reports."
    >
      {done ? (
        <div className="card flex flex-col gap-3 !p-7">
          <h2 className="text-[22px] font-bold">Check your email</h2>

          <p className="text-sm text-muted">
            We sent a confirmation link. Open it, then log in.
          </p>

          <button
            type="button"
            onClick={goToLogin}
            className="btn btn-primary"
          >
            Go to log in
          </button>
        </div>
      ) : (
        <form
          className="card flex flex-col gap-3.5 !p-7"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <h2 className="text-[22px] font-bold">Create account</h2>

          {banner && (
            <div className="banner banner-error" role="alert">
              {banner}
            </div>
          )}

          <Field
            label="Full name"
            htmlFor="name"
            error={errors.name?.message}
          >
            <input
              id="name"
              autoComplete="name"
              className={cls(errors.name)}
              {...register('name')}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={cls(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="At least 8 characters, including a letter and a number."
          >
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${cls(errors.password)} !pr-11`}
                {...register('password')}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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

          <Field
            label="Confirm password"
            htmlFor="confirm"
            error={errors.confirm?.message}
          >
            <div className="relative">
              <input
                id="confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${cls(errors.confirm)} !pr-11`}
                {...register('confirm')}
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} aria-hidden />
                ) : (
                  <Eye size={20} aria-hidden />
                )}
              </button>
            </div>
          </Field>

          {/* Terms and Privacy Policy agreement */}
          <div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                {...register('terms')}
              />

              <span>
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  Terms
                </Link>
                {' '}and{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {errors.terms && (
              <div role="alert" className="field-error">
                {errors.terms.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary !h-[46px]"
            disabled={busy}
          >
            {busy ? 'Creating...' : 'Sign up'}
          </button>

          <div className="text-center text-sm text-muted">
            Already have an account?{' '}
            <button
              type="button"
              onClick={goToLogin}
              className="text-brand underline"
            >
              Log in
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
