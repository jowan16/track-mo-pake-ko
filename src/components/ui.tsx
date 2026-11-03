import { useState, type ReactNode } from 'react'
import { Check, ShieldHalf, User } from 'lucide-react'

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {hint && !error && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
      {error && <div id={`${htmlFor}-error`} role="alert" className="field-error">{error}</div>}
    </div>
  )
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return <div className="p-10 text-sm text-muted" role="status">{text}</div>
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

export function StatusBadge({ status }: { status: 'active' | 'suspended' }) {
  const ok = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${ok ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-danger'}`}>
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />
      {ok ? 'Active' : 'Suspended'}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'user' | 'admin' }) {
  const admin = role === 'admin'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${admin ? 'bg-[#ede9fe] text-[#4c1d95]' : 'bg-[#eef0f6] text-ink'}`}>
      {admin ? <ShieldHalf size={15} aria-hidden /> : <User size={15} aria-hidden />}
      {admin ? 'Admin' : 'User'}
    </span>
  )
}

export function ProgressBar({ percent }: { percent: number }) {
  const warn = percent >= 80
  return (
    <div className="h-2.5 rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2.5 rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: warn ? '#b45309' : 'var(--accent)' }} />
    </div>
  )
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10231f]/70 p-4">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-2xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {onClose && <button className="icon-btn" aria-label="Close" onClick={onClose}>×</button>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', danger, requireText, onConfirm, onCancel, busy,
}: {
  title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; requireText?: string
  onConfirm: () => void; onCancel: () => void; busy?: boolean
}) {
  const [typed, setTyped] = useState('')
  const blocked = !!requireText && typed !== requireText
  return (
    <Modal title={title}>
      <div className="text-sm text-muted">{message}</div>
      {requireText && (
        <div className="mt-4">
          <label htmlFor="confirm-text" className="label">Type {requireText} to confirm.</label>
          <input id="confirm-text" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={blocked || busy} onClick={onConfirm}>
          {busy ? 'Working...' : confirmLabel}
        </button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  )
}

export function Checkmark() {
  return <Check size={16} aria-hidden />
}
