import { supabase } from '@/lib/supabase'
import type { VendorAdmin, Vendor } from '@/types'

export const vendorAdminService = {
  async getAdminsForVendor(vendorId: string): Promise<VendorAdmin[]> {
    const { data, error } = await supabase
      .from('vendor_admins')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getAssignmentsForVendors(vendorIds: string[]): Promise<VendorAdmin[]> {
    if (!vendorIds.length) return []

    const { data, error } = await supabase
      .from('vendor_admins')
      .select('*')
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as VendorAdmin[]
  },

  async saveAdminsForVendor(
    vendorId: string,
    admins: { admin_id: string; is_vendor_super_admin: boolean }[],
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from('vendor_admins')
      .delete()
      .eq('vendor_id', vendorId)

    if (deleteError) throw deleteError

    if (!admins.length) return

    const payload = admins.map((a) => ({
      vendor_id: vendorId,
      admin_id: a.admin_id,
      is_vendor_super_admin: a.is_vendor_super_admin,
    }))

    const { error: insertError } = await supabase
      .from('vendor_admins')
      .insert(payload)

    if (insertError) throw insertError
  },

  async getVendorSuperAdminAdminIds(): Promise<string[]> {
    const { data, error } = await supabase
      .from('vendor_admins')
      .select('admin_id')
      .eq('is_vendor_super_admin', true)

    if (error) throw error

    const rows = (data || []) as { admin_id: string }[]
    const unique = Array.from(new Set(rows.map((row) => row.admin_id)))
    return unique
  },

	async getVendorsForAdmin(adminId: string): Promise<{ vendor: Vendor; isVendorSuperAdmin: boolean }[]> {
		const { data, error } = await supabase
			.from('vendor_admins')
			.select('vendor_id, is_vendor_super_admin')
			.eq('admin_id', adminId)

		if (error) throw error
		const rows = (data || []) as { vendor_id: string; is_vendor_super_admin: boolean }[]

		if (!rows.length) return []

		const vendorIds = rows.map((row) => row.vendor_id)

		const { data: vendors, error: vendorsError } = await supabase
			.from('vendors')
			.select('*')
			.in('id', vendorIds)

		if (vendorsError) throw vendorsError
		const vendorsById = new Map((vendors || []).map((v: any) => [v.id, v as Vendor]))

		return rows
			.map((row) => {
				const vendor = vendorsById.get(row.vendor_id)
				if (!vendor) return null
				return {
					vendor,
					isVendorSuperAdmin: !!row.is_vendor_super_admin,
				}
			})
			.filter(Boolean) as { vendor: Vendor; isVendorSuperAdmin: boolean }[]
	},

  async getVendorsForAdmins(
    adminIds: string[],
  ): Promise<Record<string, { vendor: Vendor; isVendorSuperAdmin: boolean }[]>> {
    if (!adminIds.length) return {}

    const { data, error } = await supabase
      .from('vendor_admins')
      .select('admin_id, vendor_id, is_vendor_super_admin')
      .in('admin_id', adminIds)

    if (error) throw error

    const rows = (data || []) as {
      admin_id: string
      vendor_id: string
      is_vendor_super_admin: boolean
    }[]

    if (!rows.length) {
      return Object.fromEntries(adminIds.map((id) => [id, []]))
    }

    const vendorIds = Array.from(new Set(rows.map((row) => row.vendor_id)))

    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .in('id', vendorIds)

    if (vendorsError) throw vendorsError
    const vendorsById = new Map((vendors || []).map((v: any) => [v.id, v as Vendor]))

    const result: Record<string, { vendor: Vendor; isVendorSuperAdmin: boolean }[]> = Object.fromEntries(
      adminIds.map((id) => [id, []]),
    )

    for (const row of rows) {
      const vendor = vendorsById.get(row.vendor_id)
      if (!vendor) continue
      if (!result[row.admin_id]) result[row.admin_id] = []
      result[row.admin_id].push({
        vendor,
        isVendorSuperAdmin: !!row.is_vendor_super_admin,
      })
    }

    return result
  },
}
