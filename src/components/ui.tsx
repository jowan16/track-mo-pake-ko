
import { useEffect, type ReactNode } from 'react'

/* FIELD */

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>

      {children}

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {!error && hint && (
        <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

/* PAGE LOADER */

export function PageLoader({
  text = 'Please wait',
}: {
  text?: string
}) {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#f8faf9]"
      role="status"
      aria-label={text}
    >
      <span className="text-sm font-medium text-muted">
        {text}
      </span>
    </div>
  )
}

/* PAGE TITLE */

interface PageTitleProps {
  title: string
  sub?: string
  children?: ReactNode
}

export function PageTitle({
  title,
  sub,
  children,
}: PageTitleProps) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

        {sub && (
          <p className="mt-1 text-sm text-muted">{sub}</p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

/* PROGRESS BAR */

export function ProgressBar({
  percent,
}: {
  percent: number
}) {
  const safePercent = Number.isFinite(percent)
    ? Math.min(100, Math.max(0, percent))
    : 0

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-[#e8eee9]"
      role="progressbar"
      aria-valuenow={Math.round(safePercent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
        style={{ width: `${safePercent}%` }}
      />
    </div>
  )
}

/* MODAL */

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className={`my-auto w-full ${
          wide ? 'max-w-4xl' : 'max-w-lg'
        } rounded-2xl bg-white p-5 shadow-xl sm:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-modal-title"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="shared-modal-title"
            className="text-lg font-bold"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-muted hover:bg-gray-100"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  )
}

/* CONFIRMATION DIALOG */

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-muted">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>

        <button
          type="button"
          className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

/* ROLE BADGE */

export function RoleBadge({
  role,
}: {
  role: string
}) {
  const label = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <span className="inline-flex rounded-full bg-[#eef0fb] px-2.5 py-1 text-xs font-semibold text-admin">
      {label}
    </span>
  )
}

/* STATUS BADGE */

export function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalized = status.toLowerCase()

  const styles =
    normalized === 'active'
      ? 'bg-green-100 text-green-700'
      : normalized === 'suspended'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-600'

  const label =
    status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  )
}
