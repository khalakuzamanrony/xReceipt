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
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<AdminVendorPermissions | null>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshMemberships = useCallback(async () => {
    if (!user || !role) {
      setMemberships([])
      setActiveVendorId(null)
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
        setActiveVendorId((prev) => prev ?? null)
      } else {
        const entries = await vendorAdminService.getVendorsForAdmin(user.id)
        setMemberships(entries)

        setActiveVendorId((prev) => {
          if (prev && entries.some((e) => e.vendor.id === prev)) {
            return prev
          }
          return entries.length > 0 ? entries[0].vendor.id : null
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors for user')
      setMemberships([])
      setActiveVendorId(null)
    } finally {
      setLoading(false)
    }
  }, [role, user])

  useEffect(() => {
    if (!user || !role) {
      setMemberships([])
      setActiveVendorId(null)
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
