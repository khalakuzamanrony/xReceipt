import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types'

export const vendorService = {
  async getAllVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getVendorById(id: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async createVendor(input: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteVendor(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
