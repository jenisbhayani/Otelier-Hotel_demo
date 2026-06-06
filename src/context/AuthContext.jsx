import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Failed to restore session:', error.message)
      }
      setSession(currentSession ?? null)
      setUser(currentSession?.user ?? null)
      setInitializing(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setInitializing(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return { error: error.message, session: null, needsEmailConfirmation: false }
    }
    // When email confirmation is enabled in Supabase, signUp returns a user
    // but no session — the user must click the confirmation link first.
    const needsEmailConfirmation = Boolean(data.user && !data.session)
    return { error: null, session: data.session, needsEmailConfirmation }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.message, session: null }
    }
    return { error: null, session: data.session }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { error: error.message }
    }
    // Clear all hotelbeds API cache entries so stale data from this
    // session does not persist for the next user on the same browser.
    try {
      const keysToRemove = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key?.startsWith('hotelbeds-cache:')) keysToRemove.push(key)
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))
    } catch {
      // Clearing cache is best-effort; ignore storage errors.
    }
    return { error: null }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      initializing,
      isAuthenticated: Boolean(session),
      signUp,
      signIn,
      signOut,
    }),
    [session, user, initializing, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
