import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'

import { Field, Modal } from '../../components/ui'

/** Makes an existing account an admin. The person must sign up first. */
export function AddAdminButton({ primary }: { primary?: boolean }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    setBusy(true)
    const { error: e } = await supabase.rpc('admin_set_role', { p_email: email.trim(), p_role: 'admin' })
    setBusy(false)
    if (e) return setError(e.message)
    await logAudit(profile, `Promoted ${email.trim()} to admin`)
    toast.success('Admin added.')
    setOpen(false)
    setEmail('')
    void qc.invalidateQueries()
  }

  return (
    <>
      <button className={`btn ${primary ? '' : '!h-9'}`} onClick={() => { setError(''); setOpen(true) }}>+ Add admin</button>
      {open && (
        <Modal title="Add admin" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-muted">The person must already have an account. Enter their email to make them an admin.</p>
          <Field label="Email" htmlFor="admin-email" error={error}>
            <input id="admin-email" type="email" className={`input ${error ? 'input-bad' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Saving...' : 'Make admin'}</button>
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  )
}

