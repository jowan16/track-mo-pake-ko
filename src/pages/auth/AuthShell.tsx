import type { ReactNode } from 'react'
import { PiggyBank, Target, Wallet } from 'lucide-react'
import { AuthArt } from './AuthArt'

export function AuthShell({ title, text, admin, children, corner }: { title: string; text: string; admin?: boolean; children: ReactNode; corner?: ReactNode }) {
  return (
    <div className={`relative flex min-h-screen flex-col md:flex-row ${admin ? 'theme-admin' : ''}`} style={{ background: 'var(--canvas)' }}>
      {/* LEFT: picture and welcome text */}
      <section
        className={`relative flex flex-1 flex-col gap-8 overflow-hidden p-10 text-white md:p-14 ${
          admin ? 'justify-center bg-admin-side' : 'justify-between bg-[#0a211c]'
        }`}
      >
        {!admin && (
          <>
            {/* soft colored glows and a faint dot grid behind everything */}
            <div aria-hidden className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-teal-500/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            />
          </>
        )}

        <div className="relative z-10 flex items-center gap-3">
          {!admin && (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-emerald-500 text-lg font-bold text-[#0a211c] shadow-lg shadow-teal-900/40">
              ₱
            </span>
          )}
          <span className="text-xl font-bold">Track Mo, Pake ko!{admin && ' Admin'}</span>
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight">{title}</h1>
          <p className="max-w-md text-base leading-relaxed text-[#c9d8d3]">{text}</p>

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
        </div>

        {!admin && (
          <div className="relative z-10 hidden md:block">
            <AuthArt />
          </div>
        )}
      </section>

      {/* RIGHT: the form */}
      <section
        className={`relative flex flex-1 items-center justify-center p-6 pb-24 md:p-10 ${
          admin ? '' : 'bg-gradient-to-br from-[#f7f8f6] via-[#f1f6f3] to-[#e3f1ec]'
        }`}
      >
        {!admin && (
          <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
        )}
        <div className="relative flex w-full max-w-[420px] flex-col gap-4 [&_.card]:shadow-xl [&_.card]:shadow-teal-900/10">
          {children}
        </div>
      </section>

      {corner}
    </div>
  )
}

export function RoleToggle({ mode, onChange }: { mode: 'user' | 'admin'; onChange: (m: 'user' | 'admin') => void }) {
  const base = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold'
  return (
    <div role="group" aria-label="Choose log in type" className="fixed bottom-6 right-6 z-10 flex gap-1 rounded-full border border-[#c5c9d8] bg-white p-1">
      <button aria-pressed={mode === 'user'} onClick={() => onChange('user')} className={`${base} ${mode === 'user' ? 'bg-brand text-white' : 'text-ink'}`}>User</button>
      <button aria-pressed={mode === 'admin'} onClick={() => onChange('admin')} className={`${base} ${mode === 'admin' ? 'bg-admin text-white' : 'text-ink'}`}>Admin</button>
    </div>
  )
}