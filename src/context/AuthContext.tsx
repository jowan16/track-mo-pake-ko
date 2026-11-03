
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<Profile | null>
  signOut: (reason?: 'expired') => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export const SESSION_FLAG = 'tmpk_session_expired'
const MIN = 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = session?.user.id

  // Initialize and monitor the Supabase session.
  useEffect(() => {
    let active = true
    let authEventVersion = 0

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        authEventVersion += 1

        if (!active) return

        setSession(newSession)

        if (!newSession) {
          setProfile(null)
          setLoading(false)
        }
      },
    )

    const initializeSession = async () => {
      const versionAtStart = authEventVersion

      try {
        const { data, error } = await supabase.auth.getSession()

        if (!active || error) {
          if (active) setLoading(false)
          return
        }

        // Do not overwrite a newer session received from the auth listener.
        if (versionAtStart === authEventVersion) {
          setSession(data.session)

          if (!data.session) {
            setProfile(null)
            setLoading(false)
          }
        }
      } catch {
        if (active) setLoading(false)
      }
    }

    void initializeSession()

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Fetch a user's profile without allowing stale requests to overwrite state.
  const fetchProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw error
    }

    return (data as Profile | null) ?? null
  }, [])

  // Load the profile whenever the authenticated user changes.
  useEffect(() => {
    let active = true

    if (!userId) {
      setProfile(null)
      setLoading(false)

      return () => {
        active = false
      }
    }

    setLoading(true)
    setProfile(null)

    const load = async () => {
      try {
        const result = await fetchProfile(userId)

        if (active) {
          setProfile(result)
        }
      } catch (error) {
        console.error('Unable to load user profile:', error)

        if (active) {
          setProfile(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [userId, fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (!userId) return null

    try {
      const result = await fetchProfile(userId)
      setProfile(result)
      return result
    } catch (error) {
      console.error('Unable to refresh user profile:', error)
      return null
    }
  }, [userId, fetchProfile])

  const signOut = useCallback(async (reason?: 'expired') => {
    if (reason === 'expired') {
      sessionStorage.setItem(SESSION_FLAG, '1')
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Unable to sign out:', error)
    }
  }, [])

  // Idle timeout: 30 minutes for users, 15 minutes for admins.
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!profile) return

    const limit = (profile.role === 'admin' ? 15 : 30) * MIN

    const reset = () => {
      window.clearTimeout(timer.current)

      timer.current = window.setTimeout(() => {
        void signOut('expired')
      }, limit)
    }

    const events = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ]

    events.forEach((event) => {
      window.addEventListener(event, reset)
    })

    reset()

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, reset)
      })

      window.clearTimeout(timer.current)
    }
  }, [profile, signOut])

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(Ctx)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
