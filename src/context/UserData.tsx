
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Category } from '../lib/types'

interface UD {
  loading: boolean
  allCategories: Category[]
  tracked: Category[]
  pickerOptions: Category[]
  trackedIds: Set<number>
  catById: Map<number, Category>
  refresh: () => Promise<void>
}

const Ctx = createContext<UD | null>(null)

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  const [allCategories, setAll] = useState<Category[]>([])
  const [ids, setIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profile) {
      setAll([])
      setIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [c, u] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),

        supabase
          .from('user_categories')
          .select('category_id')
          .eq('user_id', profile.id),
      ])

      if (c.error) throw c.error
      if (u.error) throw u.error

      setAll((c.data as Category[]) ?? [])

      setIds(
        new Set(
          ((u.data as { category_id: number }[]) ?? []).map(
            (r) => r.category_id,
          ),
        ),
      )
    } catch (error) {
      console.error('Error loading user data:', error)
      setAll([])
      setIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<UD>(
    () => ({
      loading,
      allCategories,
      trackedIds: ids,

      tracked: allCategories.filter(
        (c) => ids.has(c.id) && c.is_active,
      ),

      pickerOptions: allCategories.filter(
        (c) => c.is_active && c.show_in_picker,
      ),

      catById: new Map(
        allCategories.map((c) => [c.id, c]),
      ),

      refresh,
    }),
    [loading, allCategories, ids, refresh],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserData() {
  const c = useContext(Ctx)

  if (!c) {
    throw new Error('useUserData must be used inside UserDataProvider')
  }

  return c
}
