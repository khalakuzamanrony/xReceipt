import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types'

const VENDOR_IMAGES_BUCKET = 'vendor-images'

const resolveVendorImageStoragePath = (value: string): string => {
  if (!value) return ''
  if (value.startsWith('data:')) return ''

  const markers = [
    `/storage/v1/object/public/${VENDOR_IMAGES_BUCKET}/`,
    `/storage/v1/object/${VENDOR_IMAGES_BUCKET}/`,
    `${VENDOR_IMAGES_BUCKET}/`,
  ]

  for (const marker of markers) {
    const idx = value.indexOf(marker)
    if (idx >= 0) {
      return value.slice(idx + marker.length)
    }
  }

  // If it's already a plain path like "<vendorId>/<file>.png" return it
  if (!value.startsWith('http') && value.includes('/')) return value
  return ''
}

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

  async uploadVendorImage(vendorId: string, file: File): Promise<{ publicUrl: string; path: string }> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'png'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`
    const path = `${vendorId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(VENDOR_IMAGES_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(VENDOR_IMAGES_BUCKET).getPublicUrl(path)
    return { publicUrl: data.publicUrl, path }
  },

  async deleteVendorImage(imageUrlOrPath: string): Promise<{ deleted: boolean; error: string | null }> {
    const path = resolveVendorImageStoragePath(imageUrlOrPath)
    if (!path) return { deleted: true, error: null }

    const { error } = await supabase.storage.from(VENDOR_IMAGES_BUCKET).remove([path])
    if (error) return { deleted: false, error: error.message }
    return { deleted: true, error: null }
  },

  async deleteVendorWithImage(
    id: string,
    imageUrlOrPath?: string | null,
  ): Promise<{ storageDeleted: boolean; storageError: string | null }> {
    let storageDeleted = true
    let storageError: string | null = null

    if (imageUrlOrPath) {
      const result = await this.deleteVendorImage(imageUrlOrPath)
      storageDeleted = result.deleted
      storageError = result.error
    }

    await this.deleteVendor(id)
    return { storageDeleted, storageError }
  },
}
