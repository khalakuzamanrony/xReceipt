import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Vendor, AdminVendorPermissions } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { vendorService } from '@/services/vendorService'
import { vendorAdminService } from '@/services/vendorAdminService'
import { adminService } from '@/services/adminService'

interface VendorMembership {
  vendor: Vendor
  isVendorSuperAdmin: boolean
}

interface VendorContextValue {
  memberships: VendorMembership[]
  activeVendorId: string | null
  activeVendor: Vendor | null
  setActiveVendorId: (vendorId: string | null) => void
  refreshMemberships: () => Promise<void>
  permissions: AdminVendorPermissions | null
  permissionsLoading: boolean
  loading: boolean
  error: string | null
}

const VendorContext = createContext<VendorContextValue | undefined>(undefined)

export function VendorProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [memberships, setMemberships] = useState<VendorMembership[]>([])
  const [activeVendorId, setActiveVendorIdState] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<AdminVendorPermissions | null>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshMemberships = useCallback(async () => {
    if (!user || !role) {
      setMemberships([])
      setActiveVendorIdState(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (role === 'grand_user') {
        const vendors = await vendorService.getAllVendors()
        setMemberships(
          vendors.map((vendor) => ({
            vendor,
            isVendorSuperAdmin: true,
          })),
        )
        setActiveVendorIdState((prev) => prev ?? null)
      } else {
        const entries = await vendorAdminService.getVendorsForAdmin(user.id)
        const activeEntries = entries.filter((e) => e.vendor.status === 'active')
        setMemberships(activeEntries)

        setActiveVendorIdState((prev) => {
          if (prev && activeEntries.some((e) => e.vendor.id === prev)) {
            return prev
          }
          return activeEntries.length > 0 ? activeEntries[0].vendor.id : null
        })

        if (entries.length > 0 && activeEntries.length === 0) {
          setError('Shop is not found. Please contact to the author.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors for user')
      setMemberships([])
      setActiveVendorIdState(null)
    } finally {
      setLoading(false)
    }
  }, [role, user])

  const setActiveVendorId = useCallback(
    (vendorId: string | null) => {
      if (!vendorId) {
        setActiveVendorIdState(null)
        return
      }

      const nextVendor = memberships.find((m) => m.vendor.id === vendorId)?.vendor
      if (!nextVendor) {
        setActiveVendorIdState(null)
        return
      }

      if (nextVendor.status === 'inactive' && role !== 'grand_user') {
        const fallbackVendor = memberships.find((m) => m.vendor.status === 'active')?.vendor ?? null
        setActiveVendorIdState(fallbackVendor?.id ?? null)
        setError('Shop is not found. Please contact to the author.')
        return
      }

      setActiveVendorIdState(vendorId)
    },
    [memberships, role],
  )

  useEffect(() => {
    if (!activeVendorId) return
    const activeVendor = memberships.find((m) => m.vendor.id === activeVendorId)?.vendor
    if (!activeVendor) return
    if (activeVendor.status === 'inactive' && role !== 'grand_user') {
      const nextActiveVendor = memberships.find((m) => m.vendor.status === 'active')?.vendor ?? null
      setActiveVendorIdState(nextActiveVendor?.id ?? null)
      setError('Shop is not found. Please contact to the author.')
    }
  }, [activeVendorId, memberships, role])

  const activeVendor = activeVendorId ? memberships.find((m) => m.vendor.id === activeVendorId)?.vendor ?? null : null

  useEffect(() => {
    if (!user || !role) {
      setMemberships([])
      setActiveVendorIdState(null)
      setPermissions(null)
      return
    }

    void refreshMemberships()
  }, [user?.id, role])

  useEffect(() => {
    if (!user || !role) {
      setPermissions(null)
      setPermissionsLoading(false)
      return
    }

    if (role !== 'admin' && role !== 'super_admin') {
      setPermissions(null)
      setPermissionsLoading(false)
      return
    }

    if (!activeVendorId) {
      setPermissions(null)
      setPermissionsLoading(false)
      // Ensure main loading is also false for admins without vendor
      setLoading(false)
      return
    }

    if (!memberships.some((m) => m.vendor.id === activeVendorId)) {
      setPermissions(null)
      setPermissionsLoading(false)
      return
    }

    const loadPermissions = async () => {
      try {
        setPermissionsLoading(true)
        const data = await adminService.getAdminVendorPermissions(user.id, activeVendorId)
        setPermissions(data)
      } catch (err) {
        console.error('Failed to load vendor permissions:', err)
        setPermissions(null)
      } finally {
        setPermissionsLoading(false)
      }
    }

    void loadPermissions()
  }, [user?.id, role, activeVendorId, memberships])

  const value: VendorContextValue = {
    memberships,
    activeVendorId,
    activeVendor,
    setActiveVendorId,
    refreshMemberships,
    permissions,
    permissionsLoading,
    loading,
    error,
  }

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
}

export function useVendor() {
  const ctx = useContext(VendorContext)
  if (!ctx) throw new Error('useVendor must be used within a VendorProvider')
  return ctx
}
