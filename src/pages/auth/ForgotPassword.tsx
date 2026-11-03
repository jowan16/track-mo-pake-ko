
import { useEffect, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
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
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.')
})

type Form = z.infer<typeof schema>

export default function ForgotPassword() {
  const nav = useNavigate()
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)

  // Navigation protection only. Does not affect email validation.
  const blocker = useBlocker(({ historyAction, nextLocation }) => {
    if (historyAction !== 'POP') return false

    const goingToUserLogin =
      nextLocation.pathname === '/login' &&
      new URLSearchParams(nextLocation.search).get('mode') !== 'admin'

    return goingToUserLogin
  })

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker.state, blocker.reset])

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, submitCount }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: ''
    }
  })

  const send = async (email: string) => {
    setBusy(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    setBusy(false)

    if (error) {
      return
    }

    setSent(email)
  }

  return (
    <AuthShell
      title="Forgot your password?"
      text="Enter your email and we will send you a link to choose a new one."
    >
      <form
        className="card flex flex-col gap-3.5 !p-7"
        onSubmit={handleSubmit((v) => send(v.email))}
        noValidate
      >
        <h2 className="text-[22px] font-bold">Reset password</h2>

        <Field
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={`input ${errors.email ? 'input-bad' : ''}`}
            {...register('email', {
              onChange: () => {
                if (submitCount > 0) {
                  void trigger('email')
                }
              }
            })}
          />
        </Field>

        <button
          type="submit"
          className="btn btn-primary !h-[46px]"
          disabled={busy}
        >
          {busy ? 'Sending...' : 'Send reset link'}
        </button>

        <div className="text-center text-sm">
          <button
            type="button"
            className="text-brand underline"
            onClick={() => nav('/login', { replace: true })}
          >
            Back to log in
          </button>
        </div>
      </form>

      {sent && (
        <div className="banner banner-ok flex flex-col gap-2" role="status">
          <b>Check your email</b>
          <span>
            If this email is registered, a reset link is on its way.
            The link expires in 30 minutes.
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
