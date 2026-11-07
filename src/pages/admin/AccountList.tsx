import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { KeyRound, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { errMsg } from '../../lib/format'
import { ConfirmDialog, RoleBadge, StatusBadge } from '../../components/ui'
import type { Profile } from '../../lib/types'

export function useProfiles(role: 'user' | 'admin') {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', role).order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })
}

type Pending = { kind: 'suspend' | 'reactivate' | 'reset'; target: Profile } | null

/** Table of users or admins with reset password, suspend and reactivate actions. */
export function AccountList({ role, search = '', showEmail }: { role: 'user' | 'admin'; search?: string; showEmail?: boolean }) {
  const { profile: me } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading, error } = useProfiles(role)
  const [pending, setPending] = useState<Pending>(null)
  const [blocked, setBlocked] = useState('')

  const run = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      const name = p.target.full_name || p.target.email || 'account'
      if (p.kind === 'reset') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(p.target.email ?? '', { redirectTo: `${window.location.origin}/reset-password` })
        if (e) throw e
        await logAudit(me, `Sent password reset to ${name}`)
        return 'Reset link sent.'
      }
   const status = p.kind === 'suspend' ? 'suspended' : 'active'

const { error: e } = await supabase.rpc('admin_set_account_status', {
  p_target_user_id: p.target.id,
  p_status: status,
})

if (e) throw e
      await logAudit(me, `${p.kind === 'suspend' ? 'Suspended' : 'Reactivated'} ${p.target.role} ${name}`)
      return p.kind === 'suspend' ? 'Account suspended.' : 'Account reactivated.'
    },
    onSuccess: (msg) => {
      toast.success(msg)
      setPending(null)
      void qc.invalidateQueries({ queryKey: ['profiles'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (e) => {
      toast.error(errMsg(e))
      setPending(null)
    },
  })

  const ask = (kind: 'suspend' | 'reactivate' | 'reset', target: Profile) => {
    setBlocked('')
    if (kind === 'suspend') {
      if (target.id === me?.id) return setBlocked('You cannot suspend your own account.')
      if (target.role === 'admin' && (data ?? []).filter((a) => a.status === 'active').length <= 1) return setBlocked('At least one active admin is required.')
    }
    setPending({ kind, target })
  }

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>
  if (error) return <div className="banner banner-error" role="alert">We could not load accounts. Try again.</div>
  const rows = (data ?? []).filter((p) => `${p.full_name} ${p.email}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {blocked && <div className="banner banner-error mb-3" role="alert">{blocked}</div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              {showEmail && <th className="th">Email</th>}
              {showEmail && <th className="th">Role</th>}
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="td text-muted">No accounts found.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
<td className="td whitespace-nowrap">
  {p.full_name || p.email || '-'}
</td>                {showEmail && <td className="td">{p.email}</td>}
                {showEmail && <td className="td"><RoleBadge role={p.role} /></td>}
                <td className="td"><StatusBadge status={p.status} /></td>
                <td className="td">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {showEmail && p.role === 'user' && (
                      <button className="btn !h-10" onClick={() => ask('reset', p)}><KeyRound size={18} aria-hidden /> Reset password</button>
                    )}
                    {p.status === 'active' ? (
                      <button className="btn btn-danger !h-10" onClick={() => ask('suspend', p)}><UserX size={18} aria-hidden /> Suspend</button>
                    ) : (
                      <button className="btn btn-ok !h-10" onClick={() => ask('reactivate', p)}><UserCheck size={18} aria-hidden /> Reactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending && (
        <ConfirmDialog
          title={pending.kind === 'suspend' ? 'Suspend this account?' : pending.kind === 'reactivate' ? 'Reactivate this account?' : 'Reset password?'}
          message={
            pending.kind === 'reset'
              ? `Send a reset link to ${pending.target.email}?`
              : pending.kind === 'suspend'
                ? `${pending.target.full_name || pending.target.email} will not be able to log in until reactivated.`
                : `${pending.target.full_name || pending.target.email} will be able to log in again.`
          }
          confirmLabel={pending.kind === 'suspend' ? 'Suspend' : pending.kind === 'reactivate' ? 'Reactivate' : 'Send link'}
          danger={pending.kind === 'suspend'}
          busy={run.isPending}
          onConfirm={() => run.mutate(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}
