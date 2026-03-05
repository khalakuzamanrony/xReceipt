import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import type { User, UserRole, AdminPermissions } from '@/types'
import { adminService } from '@/services/adminService'
import { vendorAdminService } from '@/services/vendorAdminService'

// JWT token helpers
const TOKEN_KEY = 'xreceipt_auth_token'
const USER_ID_KEY = 'xreceipt_user_id'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  permissions: AdminPermissions | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Generate a simple JWT-like token (base64 encoded JSON)
function generateToken(userId: string, email: string): string {
  const payload = {
    sub: userId,
    email,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }
  return btoa(JSON.stringify(payload))
}

function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) return null
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserAndPermissions = useCallback(async (userId?: string) => {
    setError(null)
    try {
      if (!userId) {
        const token = localStorage.getItem(TOKEN_KEY)
        if (!token) {
          setUser(null)
          setRole(null)
          setPermissions(null)
          setLoading(false)
          return
        }
        const payload = verifyToken(token)
        if (!payload) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_ID_KEY)
          setUser(null)
          setRole(null)
          setPermissions(null)
          setLoading(false)
          return
        }
        userId = payload.sub
      }

      const dbUser = await adminService.getAdminById(userId)
      if (!dbUser) {
        setError('User not found.')
        setUser(null)
        setRole(null)
        setPermissions(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_ID_KEY)
        setLoading(false)
        return
      }

      if (dbUser.status === 'inactive') {
        setError('Account is disabled. Please contact administrator.')
        setUser(null)
        setRole(null)
        setPermissions(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_ID_KEY)
        setLoading(false)
        return
      }

      if (dbUser.role === 'admin' || dbUser.role === 'super_admin') {
        const entries = await vendorAdminService.getVendorsForAdmin(dbUser.id)
        const hasActiveVendor = entries.some((e) => e.vendor.status === 'active')
        if (!hasActiveVendor) {
          setError('Shop is disabled. Please contact administrator.')
          setUser(null)
          setRole(null)
          setPermissions(null)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_ID_KEY)
          setLoading(false)
          return
        }
      }

      setUser(dbUser)
      setRole(dbUser.role)
      // Permissions are loaded in VendorContext with vendor scope
      setPermissions(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auth state')
      setUser(null)
      setRole(null)
      setPermissions(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUserAndPermissions()
  }, [loadUserAndPermissions])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // Fetch user by email with password hash
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (fetchError || !data) {
        throw new Error('Invalid email or password')
      }

      const dbUser = data as User

      // Check if user has password hash
      if (!dbUser.password_hash) {
        throw new Error('Account has no password set. Please contact administrator.')
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, dbUser.password_hash)
      
      if (!isValidPassword) {
        throw new Error('Invalid email or password')
      }

      if (dbUser.status === 'inactive') {
        throw new Error('Account is disabled. Please contact administrator.')
      }

      if (dbUser.role === 'admin' || dbUser.role === 'super_admin') {
        const entries = await vendorAdminService.getVendorsForAdmin(dbUser.id)
        const hasActiveVendor = entries.some((e) => e.vendor.status === 'active')
        if (!hasActiveVendor) {
          throw new Error('Shop is disabled. Please contact administrator.')
        }
      }

      // Generate and store token
      const token = generateToken(dbUser.id, dbUser.email)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_ID_KEY, dbUser.id)

      // Set user state
      setUser(dbUser)
      setRole(dbUser.role)
      // Permissions are loaded in VendorContext with vendor scope
      setPermissions(null)

      setLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setUser(null)
      setRole(null)
      setPermissions(null)
      setLoading(false)
      return false
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_ID_KEY)
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

// Helper function to hash passwords (for admin service)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Helper to check if token exists
export function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return false
  return verifyToken(token) !== null
}
