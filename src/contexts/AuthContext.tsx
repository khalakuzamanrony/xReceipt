import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, UserRole, AdminPermissions } from '@/types'
import { adminService } from '@/services/adminService'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  permissions: AdminPermissions | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserAndPermissions = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true
    if (showLoading) {
      setLoading(true)
    }
    setError(null)
    try {
      const { data } = await supabase.auth.getUser()
      const authUser = data.user

      if (!authUser) {
        setUser(null)
        setRole(null)
        setPermissions(null)
        return
      }

      if (!authUser.email) {
        setError('Authenticated user has no email address.')
        setUser(null)
        setRole(null)
        setPermissions(null)
        return
      }

      const dbUser = await adminService.getAdminByEmail(authUser.email)
      if (!dbUser) {
        setError('No matching admin/user record found for this account.')
        setUser(null)
        setRole(null)
        setPermissions(null)
        return
      }

      setUser(dbUser)
      setRole(dbUser.role)

      if (dbUser.role === 'admin' || dbUser.role === 'super_admin') {
        const perms = await adminService.getAdminPermissions(dbUser.id)
        setPermissions(perms)
      } else {
        // Grand User has full access; permissions not strictly needed
        setPermissions(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auth state')
      setUser(null)
      setRole(null)
      setPermissions(null)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadUserAndPermissions({ showLoading: true })

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      // Supabase may refresh tokens when a tab regains focus.
      // Avoid turning on the full-screen loader for token refresh events.
      if (event === 'TOKEN_REFRESHED') return

      // These events should update the in-memory user/role/permissions, but should not
      // present as a full page reload when the user switches tabs or minimizes.
      void loadUserAndPermissions({ showLoading: false })
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      await loadUserAndPermissions({ showLoading: false })
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setUser(null)
      setRole(null)
      setPermissions(null)
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setRole(null)
      setPermissions(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextValue = {
    user,
    role,
    permissions,
    loading,
    error,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
