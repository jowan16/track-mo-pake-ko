import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { CategoryIcon } from '../lib/icons'
import { useAuth } from '../context/AuthContext'
import { useUserData } from '../context/UserData'
import { errMsg } from '../lib/format'

const HINTS: Record<string, string> = {
  transportation: 'Fare, fuel, commute',
  medicine: 'Meds, checkups',
  'food-water': 'Meals, groceries, water',
  'bills-utilities': 'Electric, internet, water bill',
  entertainment: 'Movies, games, outings',
  shopping: 'Clothes, gadgets, other items',
  rent: 'Housing and dorm',
  'others-savings': 'Other costs and savings',
}

/** First-login popup: the user chooses which categories to track. */
export function CategoryPicker() {
  const { profile } = useAuth()
  const { pickerOptions, refresh } = useUserData()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const first = profile?.full_name?.split(' ')[0]

  const toggle = (id: number) => {
    setError('')
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const save = async () => {
    if (selected.size === 0) return setError('Select at least one category to continue.')
    if (!profile) return
    setSaving(true)
    const rows = [...selected].map((category_id) => ({ user_id: profile.id, category_id }))
    const { error: e } = await supabase.from('user_categories').insert(rows)
    setSaving(false)
    if (e) return toast.error(errMsg(e))
    await refresh()
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="picker-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10231f]/75 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h2 id="picker-title" className="text-2xl font-bold">What do you want to track?</h2>
        <p className="mt-1.5 text-sm text-muted">
          Welcome{first ? `, ${first}` : ''}. Choose the categories you spend on. You can change them anytime in Settings.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {pickerOptions.map((c) => {
            const on = selected.has(c.id)
            return (
              <label key={c.id} className={`flex min-h-[104px] cursor-pointer flex-col gap-1 rounded-xl border p-3.5 text-sm ${on ? 'border-2 border-brand bg-[#e6f4f1]' : 'border-[#cbd3cf] bg-white'}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2.5"><CategoryIcon category={c} size={40} /><b>{c.name}</b></span>
                  <input type="checkbox" className="h-4 w-4" checked={on} onChange={() => toggle(c.id)} aria-label={c.name} />
                </span>
                <small className="text-xs text-muted">{HINTS[c.slug] ?? ''}</small>
                {on && <small className="text-xs font-bold">Selected</small>}
              </label>
            )
          })}
        </div>
        {error ? (
          <div role="alert" className="banner banner-error mt-4">{error}</div>
        ) : (
          <div className="mt-4 text-sm text-muted">{selected.size} categories selected</div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <button className="text-sm font-medium text-brand underline" onClick={() => setSelected(new Set(pickerOptions.map((c) => c.id)))}>Select all</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Continue to dashboard'}</button>
        </div>
      </div>
    </div>
  )
}
