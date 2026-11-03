import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Ban, CircleCheck, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { CATEGORY_ICONS, CategoryIcon } from '../../lib/icons'
import { errMsg } from '../../lib/format'
import { ConfirmDialog, Field, PageLoader, PageTitle } from '../../components/ui'
import type { Category } from '../../lib/types'

interface Draft { id: number | null; name: string; color: string; icon: string; show: boolean }
const blank: Draft = { id: null, name: '', color: '#0F766E', icon: 'coins', show: true }

export default function Categories() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error) throw error
      return rows as Category[]
    },
  })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<{ name?: string; color?: string; show?: string }>({})
  const [toggle, setToggle] = useState<{ cat: Category; users: number } | null>(null)

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = { name: d.name.trim(), color: d.color.toUpperCase(), bg: `${d.color.toUpperCase()}22`, icon: d.icon, show_in_picker: d.show }
      if (d.id === null) {
        const slug = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
        const order = Math.max(0, ...(data ?? []).map((c) => c.sort_order)) + 1
        const { error } = await supabase.from('categories').insert({ ...row, slug, sort_order: order })
        if (error) throw error
        await logAudit(profile, `Added category "${row.name}"`)
      } else {
        const { error } = await supabase.from('categories').update(row).eq('id', d.id)
        if (error) throw error
        await logAudit(profile, `Updated category "${row.name}"`)
      }
    },
    onSuccess: () => {
      toast.success('Category saved.')
      setDraft(null)
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e: { code?: string }) => setErrors({ name: e?.code === '23505' ? 'This category already exists.' : errMsg(e) }),
  })

  const flip = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id)
      if (error) throw error
      await logAudit(profile, `${c.is_active ? 'Disabled' : 'Enabled'} category "${c.name}"`)
    },
    onSuccess: () => {
      setToggle(null)
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(errMsg(e)),
  })

  if (isLoading || !data) return <PageLoader />

  const edit = (c: Category) => { setErrors({}); setDraft({ id: c.id, name: c.name, color: c.color, icon: c.icon, show: c.show_in_picker }) }

  const submit = () => {
    if (!draft) return
    const next: typeof errors = {}
    if (!draft.name.trim()) next.name = 'Enter a category name.'
    else if (draft.name.trim().length > 30) next.name = 'Name is too long (30 characters max).'
    if (!/^#[0-9a-fA-F]{6}$/.test(draft.color)) next.color = 'Enter a valid color code, for example #0F766E.'
    if (!draft.show && data.filter((c) => c.id !== draft.id && c.is_active && c.show_in_picker).length === 0) next.show = 'At least one category must stay visible in the picker.'
    setErrors(next)
    if (Object.keys(next).length === 0) save.mutate(draft)
  }

  const askToggle = async (c: Category) => {
    if (!c.is_active) return flip.mutate(c)
    const { count } = await supabase.from('user_categories').select('*', { count: 'exact', head: true }).eq('category_id', c.id)
    setToggle({ cat: c, users: count ?? 0 })
  }

  const preview = draft ? { name: draft.name || 'New category', icon: draft.icon, color: /^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#4B5563', bg: `${draft.color}22` } : null

  return (
    <>
      <PageTitle title="Default categories" sub="The options users choose from after their first login.">
        <button className="btn btn-primary" onClick={() => { setErrors({}); setDraft({ ...blank }) }}>+ New category</button>
      </PageTitle>
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card grid gap-3 sm:grid-cols-2">
          {data.map((c) => {
            const sel = draft?.id === c.id
            return (
              <div key={c.id} className={`flex items-center gap-3 rounded-xl bg-white p-3.5 ${sel ? 'border-2 border-admin' : 'border border-[#e4e6ee]'} ${c.is_active ? '' : 'opacity-60'}`}>
                <CategoryIcon category={c} size={48} />
                <div className="min-w-0 flex-1">
                  <b className="text-[15px]">{c.name}</b>
                  <div className="text-xs text-[#565c75]">{!c.is_active ? 'Disabled' : c.show_in_picker ? 'Shown in picker' : 'Hidden from picker'}</div>
                </div>
                <button className="icon-btn" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => edit(c)}><Pencil size={18} aria-hidden /></button>
                <button className="icon-btn" aria-label={`${c.is_active ? 'Disable' : 'Enable'} ${c.name}`} title={c.is_active ? 'Disable' : 'Enable'} onClick={() => void askToggle(c)}>
                  {c.is_active ? <Ban size={18} aria-hidden /> : <CircleCheck size={18} aria-hidden />}
                </button>
              </div>
            )
          })}
        </div>

        <div className="card flex h-fit flex-col gap-3.5">
          {!draft || !preview ? (
            <p className="text-sm text-muted">Choose Edit on a category, or create a new one.</p>
          ) : (
            <>
              <div className="flex items-center gap-3"><CategoryIcon category={preview} size={48} /><h2 className="text-base font-bold">{draft.id === null ? 'New category' : 'Edit category'}</h2></div>
              <Field label="Name" htmlFor="c-name" error={errors.name}>
                <input id="c-name" className={`input ${errors.name ? 'input-bad' : ''}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Color" htmlFor="c-color" error={errors.color}>
                <input id="c-color" className={`input ${errors.color ? 'input-bad' : ''}`} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
              </Field>
              <div>
                <span className="label">Icon</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => {
                    const on = draft.icon === key
                    return (
                      <button key={key} type="button" aria-label={`Icon ${key}`} aria-pressed={on} onClick={() => setDraft({ ...draft, icon: key })} className={`flex h-11 w-11 items-center justify-center rounded-lg ${on ? 'border-2 border-admin bg-[#eef0fb]' : 'border border-[#c5c9d8] bg-white'}`}>
                        <Icon size={20} aria-hidden />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.show} onChange={(e) => setDraft({ ...draft, show: e.target.checked })} /> Show in first-login picker</label>
                {errors.show && <div role="alert" className="field-error">{errors.show}</div>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving...' : 'Save changes'}</button>
                <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </section>

      {toggle && (
        <ConfirmDialog
          title={`Disable ${toggle.cat.name}?`}
          message={`${toggle.users.toLocaleString()} users track this category. Disabling hides it from new users only. Existing records stay.`}
          confirmLabel="Disable"
          danger
          busy={flip.isPending}
          onConfirm={() => flip.mutate(toggle.cat)}
          onCancel={() => setToggle(null)}
        />
      )}
    </>
  )
}
