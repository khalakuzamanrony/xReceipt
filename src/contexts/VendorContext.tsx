import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Vendor } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { vendorService } from '@/services/vendorService'
import { vendorAdminService } from '@/services/vendorAdminService'

interface VendorMembership {
  vendor: Vendor
  isVendorSuperAdmin: boolean
}

interface VendorContextValue {
  memberships: VendorMembership[]
  activeVendorId: string | null
  setActiveVendorId: (vendorId: string | null) => void
  loading: boolean
  error: string | null
}

const VendorContext = createContext<VendorContextValue | undefined>(undefined)

export function VendorProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [memberships, setMemberships] = useState<VendorMembership[]>([])
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !role) {
      setMemberships([])
      setActiveVendorId(null)
      return
    }

    const loadMemberships = async () => {
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
    }

    void loadMemberships()
  }, [user?.id, role])

  const value: VendorContextValue = {
    memberships,
    activeVendorId,
    setActiveVendorId,
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
