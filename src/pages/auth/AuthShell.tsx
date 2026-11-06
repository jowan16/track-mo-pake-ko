import { useEffect, useRef, type ReactNode } from 'react'
import { PiggyBank, Target, Wallet, X } from 'lucide-react'
import { AuthArt } from './AuthArt'

interface AuthShellProps {
  title: string
  text: string
  admin?: boolean
  children: ReactNode
  corner?: ReactNode
  /** Show the form popup. Pages other than Log in leave this on. */
  open?: boolean
  /** When given, the popup gets a close button, closes with Esc and closes when the dark area is clicked. */
  onClose?: () => void
}

/**
 * Full-screen welcome picture. The form (children) appears in a popup on top of it.
 */
export function AuthShell({ title, text, admin, children, corner, open = true, onClose }: AuthShellProps) {
  const box = useRef<HTMLDivElement>(null)

  // Close with the Escape key.
  useEffect(() => {
    if (!open || !onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Put the cursor in the first field when the popup opens.
  useEffect(() => {
    if (open) box.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [open])

  return (
    <div
      className={`relative min-h-screen overflow-hidden text-white ${admin ? 'theme-admin bg-admin-side' : 'bg-[#0a211c]'}`}
    >
      {/* soft colored glows and a faint dot grid behind everything */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-28 -top-28 h-[28rem] w-[28rem] rounded-full blur-3xl ${admin ? 'bg-indigo-500/25' : 'bg-teal-500/25'}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl ${admin ? 'bg-violet-500/20' : 'bg-amber-400/15'}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />

      {/* WELCOME SCREEN */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-8 py-8 md:px-14 md:py-10">
        <header className="flex items-center gap-3">
          {!admin && (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-emerald-500 text-lg font-bold text-[#0a211c] shadow-lg shadow-teal-900/40">
              ₱
            </span>
          )}
          <span className="text-xl font-bold">Track Mo, Pake ko!{admin && ' Admin'}</span>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
            <p className="max-w-lg text-base leading-relaxed text-[#c9d8d3] md:text-lg">{text}</p>

            {!admin && (
              <ul className="mt-1 flex flex-wrap gap-2.5 text-sm" aria-label="What you can do">
                {[
                  [Wallet, 'Track spending'],
                  [Target, 'Set budgets'],
                  [PiggyBank, 'Save smarter'],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof Wallet
                  return (
                    <li key={label as string} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
                      <I size={16} aria-hidden className="text-teal-300" />
                      {label as string}
                    </li>
                  )
                })}
              </ul>
            )}

            {admin && <p className="text-[13px] text-[#b7bdd6]">All admin actions are recorded in the audit log.</p>}
            {corner && <p className="text-sm text-[#9fb8b0]">Use the User / Admin switch at the bottom right to log in.</p>}
          </div>

          {!admin && (
            <div className="hidden justify-center md:flex [&_svg]:max-w-[720px]">
              <AuthArt />
            </div>
          )}
        </main>
      </div>

      {/* FORM POPUP */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-40 flex overflow-y-auto bg-black/45 p-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (onClose && e.target === e.currentTarget) onClose()
          }}
        >
          <div ref={box} className="relative m-auto w-full max-w-[420px] [&_.card]:shadow-2xl [&_.card]:shadow-black/30">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-gray-100"
              >
                <X size={18} aria-hidden />
              </button>
            )}
            <div className="flex flex-col gap-4 text-ink">{children}</div>
          </div>
        </div>
      )}

      {corner}
    </div>
  )
}

/** The User / Admin switch. Clicking a side opens that log in popup; clicking the active side closes it. */
export function RoleToggle({ mode, onChange }: { mode: 'user' | 'admin' | null; onChange: (m: 'user' | 'admin') => void }) {
  const base = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition'
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <span className="hidden text-sm font-medium text-white/80 sm:inline">Log in as</span>
      <div role="group" aria-label="Choose log in type" className="flex gap-1 rounded-full border border-[#c5c9d8] bg-white p-1 shadow-lg">
        <button type="button" aria-pressed={mode === 'user'} onClick={() => onChange('user')} className={`${base} ${mode === 'user' ? 'bg-brand text-white' : 'text-ink hover:bg-gray-100'}`}>
          User
        </button>
        <button type="button" aria-pressed={mode === 'admin'} onClick={() => onChange('admin')} className={`${base} ${mode === 'admin' ? 'bg-admin text-white' : 'text-ink hover:bg-gray-100'}`}>
          Admin
        </button>
      </div>
    </div>
  )
}