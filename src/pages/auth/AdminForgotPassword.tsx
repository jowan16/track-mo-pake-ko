
import { useRef, useState } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
  useBlocker,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { Field } from '../../components/ui'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your admin email address.')
    .email('Enter a valid email address.'),
})

type Form = z.infer<typeof schema>

export default function AdminForgotPassword() {
  const nav = useNavigate()
  const location = useLocation()

  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)

  const fromLogin =
    (location.state as { fromLogin?: boolean } | null)?.fromLogin === true

  // Allow Admin Login navigation only through the Login button.
  const allowLoginNavigation = useRef(false)

  // Block browser Back navigation to Admin Login.
  useBlocker(({ nextLocation }) => {
    const goingToAdminLogin =
      nextLocation.pathname === '/login' &&
      new URLSearchParams(nextLocation.search).get('mode') === 'admin'

    return goingToAdminLogin && !allowLoginNavigation.current
  })

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, submitCount },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
    },
  })

  const send = async (email: string) => {
    setBusy(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return
      }

      setSent(email)
    } finally {
      setBusy(false)
    }
  }

  if (!fromLogin) {
    return <Navigate to="/login?mode=admin" replace />
  }

  return (
    <AuthShell
      admin
      title="Admin password recovery"
      text="Enter your administrator email address to receive a password reset link."
    >
      <form
        className="card flex flex-col gap-3.5 !p-7"
        onSubmit={handleSubmit((v) => send(v.email))}
        noValidate
      >
        <h2 className="text-[22px] font-bold">
          Reset admin password
        </h2>

        <Field
          label="Admin email"
          htmlFor="admin-email"
          error={errors.email?.message}
        >
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            aria-invalid={!!errors.email}
            className={`input ${errors.email ? 'input-bad' : ''}`}
            {...register('email', {
              onChange: () => {
                setSent('')

                if (submitCount > 0) {
                  void trigger('email')
                }
              },
            })}
          />
        </Field>

        <button
          type="submit"
          className="btn btn-primary !h-[46px]"
          disabled={busy}
        >
          {busy ? 'Sending...' : 'Send admin reset link'}
        </button>

        <div className="text-center text-sm">
          <button
            type="button"
            className="text-admin underline"
            onClick={() => {
              allowLoginNavigation.current = true
              nav('/login?mode=admin', { replace: true })
            }}
          >
            Back to admin login
          </button>
        </div>
      </form>

      {sent && (
        <div className="banner banner-ok flex flex-col gap-2" role="status">
          <b>Check your admin email</b>

          <span>
            If this email is registered, a reset link is on its way.
            The link expires according to your Supabase configuration.
          </span>

          <button
            type="button"
            className="btn w-fit"
            disabled={busy}
            onClick={() => void send(sent)}
          >
            Resend link
          </button>
        </div>
      )}
    </AuthShell>
  )
}
