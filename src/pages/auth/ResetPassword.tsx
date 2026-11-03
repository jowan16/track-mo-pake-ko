import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { Field } from '../../components/ui'
import { AuthShell } from './AuthShell'
import { passwordRule } from './SignUp'

const schema = z
  .object({
    password: passwordRule,
    confirm: z.string().min(1, 'Please confirm your password.')
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.'
  })

type Form = z.infer<typeof schema>

export default function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      confirm: ''
    }
  })

  const pw = watch('password') ?? ''

  const strength = Math.min(
    100,
    (pw.length >= 8 ? 40 : pw.length * 4) +
      (/[A-Za-z]/.test(pw) ? 20 : 0) +
      (/\d/.test(pw) ? 20 : 0) +
      (/[^A-Za-z0-9]/.test(pw) ? 20 : 0)
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY' || s) {
        setReady(true)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const onSubmit = async (v: Form) => {
    setBusy(true)
    setBanner('')

    const { error } = await supabase.auth.updateUser({
      password: v.password
    })

    setBusy(false)

    if (error) {
      setBanner(error.message)
      return
    }

    toast.success('Password updated.')
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  return (
    <AuthShell
      title="Choose a new password"
      text="Pick a strong password you have not used before."
    >
      {ready === false ? (
        <div className="banner banner-error" role="alert">
          Link expired? This reset link is no longer valid.{' '}
          <Link
            to="/forgot-password"
            className="text-brand underline"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <form
          className="card flex flex-col gap-3.5 !p-7"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <h2 className="text-[22px] font-bold">
            Set new password
          </h2>

          {banner && (
            <div className="banner banner-error" role="alert">
              {banner}
            </div>
          )}

          <Field
            label="New password"
            htmlFor="password"
            error={errors.password?.message}
          >
            <input
  id="password"
  type="password"
  autoComplete="new-password"
  aria-invalid={!!errors.password}
  className={`input ${errors.password ? 'input-bad' : ''}`}
  {...register('password')}
/>
          </Field>

          <div>
            <div className="h-2 rounded bg-line">
              <div
                className="h-2 rounded"
                style={{
                  width: `${strength}%`,
                  background: strength < 60 ? '#b42318' : '#0f766e'
                }}
              />
            </div>

            <div className="mt-1 text-xs text-muted">
              Strength: {strength < 40 ? 'weak' : strength < 80 ? 'fair' : 'strong'}
            </div>
          </div>

          <Field
            label="Confirm password"
            htmlFor="confirm"
            error={errors.confirm?.message}
          >
          <input
  id="confirm"
  type="password"
  autoComplete="new-password"
  aria-invalid={!!errors.confirm}
  className={`input ${errors.confirm ? 'input-bad' : ''}`}
  {...register('confirm')}
/>
          </Field>

          <button
            type="submit"
            className="btn btn-primary !h-[46px]"
            disabled={busy || !ready}
          >
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}