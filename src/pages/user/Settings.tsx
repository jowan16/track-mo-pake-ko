
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Mail,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errMsg } from '../../lib/format'
import { Field, Modal } from '../../components/ui'
import { passwordRule } from '../auth/SignUp'

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(60, 'Name is too long (60 characters max).'),
  password: z.string().optional(),
}).superRefine(({ password }, ctx) => {
  if (password && !passwordRule.safeParse(password).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: 'Password must be at least 8 characters and include a letter and a number.',
    })
  }
})

type ProfileForm = z.infer<typeof profileSchema>
type Theme = 'light' | 'dark'

const THEME_KEY = 'trackmo-theme'

type IconCmp = ComponentType<{
  size?: number
  'aria-hidden'?: boolean
}>

/* Section heading */
function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: IconCmp
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon size={20} aria-hidden />
      </span>

      <div>
        <h2 className="text-xl font-bold leading-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
    </div>
  )
}

/* On/off switch */
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`min-w-[30px] text-right text-xs font-bold ${
          checked ? 'text-green-600' : 'text-muted'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          checked ? 'bg-green-600' : 'bg-gray-400'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

/* Setting row */
function Row({
  title,
  desc,
  icon,
  children,
}: {
  title: string
  desc: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-4 first:border-t-0">
      <div className="flex items-center gap-3.5">
        {icon}

        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{desc}</p>
        </div>
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { profile, refreshProfile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBudgetAlerts, setSavingBudgetAlerts] = useState(false)

  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(
    () =>
      !!profile?.email_alerts &&
      !!profile?.warn_80 &&
      !!profile?.warn_100
  )

  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light',
  )

  const nf = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.full_name ?? '',
      password: '',
    },
  })

  // Synchronize settings only when the authenticated user changes.
  useEffect(() => {
    if (!profile) return

    setBudgetAlertsEnabled(
      !!profile.email_alerts &&
      !!profile.warn_80 &&
      !!profile.warn_100
    )
  }, [profile?.id])

  // Apply the selected theme.
  useEffect(() => {
    document.documentElement.classList.toggle(
      'theme-dark',
      theme === 'dark',
    )

    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const openEdit = () => {
    nf.reset({
      name: profile?.full_name ?? '',
      password: '',
    })

    setEditing(true)
  }

  // Save profile name and optionally update password.
  const saveProfile = async (v: ProfileForm) => {
    if (!profile) return

    setSavingProfile(true)

    try {
      if (v.password?.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: v.password,
        })

        if (passwordError) {
          toast.error(passwordError.message)
          return
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: v.name })
        .eq('id', profile.id)

      if (profileError) {
        toast.error(errMsg(profileError))
        return
      }

      await refreshProfile()

      setEditing(false)

      nf.reset({
        name: v.name,
        password: '',
      })

      toast.success(
        v.password?.trim()
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully.',
      )
    } catch (error) {
      toast.error(errMsg(error))
    } finally {
      setSavingProfile(false)
    }
  }

  // Update Budget Alerts without refreshing the profile.
  const updateBudgetAlerts = async (enabled: boolean) => {
    if (!profile || savingBudgetAlerts) return

    const previousValue = budgetAlertsEnabled

    // Update the switch immediately.
    setBudgetAlertsEnabled(enabled)
    setSavingBudgetAlerts(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_alerts: enabled,
          warn_80: enabled,
          warn_100: enabled,
        })
        .eq('id', profile.id)

      if (error) {
        throw error
      }

      toast.success(
        enabled
          ? 'Budget alerts enabled successfully.'
          : 'Budget alerts disabled successfully.'
      )
    } catch (error) {
      console.error('Budget Alerts update failed:', error)

      // Restore the previous switch value if saving fails.
      setBudgetAlertsEnabled(previousValue)

      toast.error(errMsg(error))
    } finally {
      setSavingBudgetAlerts(false)
    }
  }

  const dark = theme === 'dark'

  const cardCls = 'card border border-line !p-6'

  return (
    <>
      {/* PAGE TITLE */}
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <SlidersHorizontal size={24} aria-hidden />
        </span>

        <div>
          <h1 className="text-[26px] font-bold leading-tight">
            Settings
          </h1>

          <p className="text-sm text-muted">
            Manage your account and application preferences.
          </p>
        </div>
      </header>

      {/* MY ACCOUNT */}
      <section className={cardCls} aria-label="My account">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              <User size={28} aria-hidden />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                My account
              </p>

              <p className="text-xl font-bold leading-tight">
                {profile?.full_name || 'Your Profile'}
              </p>

              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <Mail size={16} aria-hidden />
                {profile?.email || 'Add your email address'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openEdit}
          >
            Edit Profile
          </button>
        </div>
      </section>

      {/* APPEARANCE */}
      <section className={cardCls} aria-label="Appearance">
        <SectionHeader
          icon={Palette}
          title="Appearance"
          desc="Choose between light and dark mode for the entire application."
        />

        <div className="mt-4 border-t border-line">
          <Row
            title={dark ? 'Dark Mode' : 'Light Mode'}
            desc={
              dark
                ? 'Dark appearance is currently enabled.'
                : 'Light appearance is currently enabled.'
            }
            icon={
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  dark
                    ? 'bg-[#e0e7ff] text-[#4f46e5]'
                    : 'bg-[#fef9c3] text-[#ca8a04]'
                }`}
              >
                {dark ? (
                  <Moon size={20} aria-hidden />
                ) : (
                  <Sun size={20} aria-hidden />
                )}
              </span>
            }
          >
            <Toggle
              checked={dark}
              onChange={(v) => setTheme(v ? 'dark' : 'light')}
              label="Dark mode"
            />
          </Row>
        </div>
      </section>

      {/* PREFERENCES */}
      <section className={cardCls} aria-label="Preference">
        <SectionHeader
          icon={SlidersHorizontal}
          title="Preference"
          desc="Manage your notification preference."
        />

        <div className="mt-4 border-t border-line">
          {/* BUDGET ALERTS */}
          <Row
            title="Budget Alerts"
            desc="Receive email alerts when your category spending reaches 80% or 100% of its monthly budget."
          >
            <Toggle
              label="Budget alerts"
              checked={budgetAlertsEnabled}
              disabled={savingBudgetAlerts}
              onChange={updateBudgetAlerts}
            />
          </Row>
        </div>
      </section>

      {/* EDIT PROFILE AND PASSWORD MODAL */}
      {editing && (
        <Modal
          title="Edit Profile & Password"
          onClose={() => setEditing(false)}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={nf.handleSubmit(saveProfile)}
            noValidate
          >
            <Field
              label="Full Name"
              htmlFor="name"
              error={nf.formState.errors.name?.message}
            >
              <input
                id="name"
                className={`input ${
                  nf.formState.errors.name ? 'input-bad' : ''
                }`}
                {...nf.register('name')}
              />
            </Field>

            <Field
              label="Email Address"
              htmlFor="email"
              hint="Your email address is used to log in to your account."
            >
              <input
                id="email"
                className="input bg-gray-50"
                value={profile?.email ?? ''}
                readOnly
              />
            </Field>

            <Field
              label="New Password"
              htmlFor="password"
              error={nf.formState.errors.password?.message}
            >
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter a new password"
                className={`input ${
                  nf.formState.errors.password ? 'input-bad' : ''
                }`}
                {...nf.register('password')}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setEditing(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
