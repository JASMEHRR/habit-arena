import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, onAuthStateChange, getProfile } from '../lib/auth.js'

const AuthContext = createContext(null)

// Tracks the Supabase auth session and the signed-in user's profile
// (display name/avatar), so any page can read `useAuth()` instead of
// re-fetching. `loading` covers the initial session check on page load.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    try {
      setProfile(await getProfile(userId))
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      setSession(s)
      if (s) loadProfile(s.user.id)
      setLoading(false)
    })
    const unsub = onAuthStateChange((s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => { alive = false; unsub() }
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile: () => session && loadProfile(session.user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
