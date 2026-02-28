import { supabase } from '@/lib/supabase'
import { hasAuthToken } from '@/contexts/AuthContext'
import type { BrandSettings } from '@/types'

const BRAND_ASSETS_BUCKET = import.meta.env.VITE_BRAND_ASSETS_BUCKET || 'brand-assets'

const resolveBrandIconStoragePath = (value: string): string => {
  if (!value) return ''
  if (value.startsWith('data:')) return ''

  const markers = [
    `/storage/v1/object/public/${BRAND_ASSETS_BUCKET}/`,
    `/storage/v1/object/${BRAND_ASSETS_BUCKET}/`,
    `${BRAND_ASSETS_BUCKET}/`,
  ]

  for (const marker of markers) {
    const idx = value.indexOf(marker)
    if (idx >= 0) {
      return value.slice(idx + marker.length).split('?')[0].split('#')[0]
    }
  }

  if (!value.startsWith('http') && value.includes('/')) return value.split('?')[0].split('#')[0]
  return ''
}

export const brandSettingsService = {
  async getForVendor(vendorId: string): Promise<BrandSettings | null> {
    const { data, error } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('vendor_id', vendorId)
      .maybeSingle()

    if (error) throw error
    return data || null
  },

  async upsertBrandInfoForVendor(
    vendorId: string,
    updates: Pick<BrandSettings, 'app_name' | 'tagline'>,
  ): Promise<BrandSettings> {
    const payload = {
      vendor_id: vendorId,
      app_name: updates.app_name,
      tagline: updates.tagline,
    }

    const { data, error } = await supabase
      .from('brand_settings')
      .upsert(payload, { onConflict: 'vendor_id' })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async upsertBrandIconForVendor(
    vendorId: string,
    updates: Pick<BrandSettings, 'icon_url' | 'icon_path'>,
  ): Promise<BrandSettings> {
    const payload = {
      vendor_id: vendorId,
      icon_url: updates.icon_url,
      icon_path: updates.icon_path,
    }

    const { data, error } = await supabase
      .from('brand_settings')
      .upsert(payload, { onConflict: 'vendor_id' })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async upsertForVendor(
    vendorId: string,
    updates: Pick<BrandSettings, 'app_name' | 'tagline' | 'icon_url' | 'icon_path'>,
  ): Promise<BrandSettings> {
    const payload = {
      vendor_id: vendorId,
      app_name: updates.app_name,
      tagline: updates.tagline,
      icon_url: updates.icon_url,
      icon_path: updates.icon_path,
    }

    const { data, error } = await supabase
      .from('brand_settings')
      .upsert(payload, { onConflict: 'vendor_id' })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async uploadBrandIcon(
    vendorId: string,
    file: File,
  ): Promise<{ publicUrl: string; path: string }> {
    if (!hasAuthToken()) {
      throw new Error('You must be logged in to upload an app icon.')
    }

    // Always upload to a deterministic path so it truly replaces the previous icon.
    // This matches the behavior you have in other modules (single stable path per entity).
    const path = `${vendorId}/app-icon`

    const { error: uploadError } = await supabase.storage.from(BRAND_ASSETS_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    })

    if (uploadError) {
      const message = (uploadError as any)?.message || String(uploadError)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
      const isRls =
        message.toLowerCase().includes('row-level security') ||
        message.toLowerCase().includes('violates row-level security')

      const enriched = message.includes('Bucket not found')
        ? `Bucket not found: "${BRAND_ASSETS_BUCKET}". Supabase URL: "${supabaseUrl}". Create the bucket and policies, or set VITE_BRAND_ASSETS_BUCKET to the correct bucket name.`
        : isRls
          ? `Storage upload blocked by RLS for bucket "${BRAND_ASSETS_BUCKET}". Supabase URL: "${supabaseUrl}". Ensure you ran the storage policies for brand assets and that you are logged in.`
          : message

      throw new Error(enriched)
    }

    const { data } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(path)
    // Add cache-busting timestamp to prevent browser caching
    const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`
    return { publicUrl: cacheBustedUrl, path }
  },

  async deleteBrandIcon(iconUrlOrPath: string): Promise<{ deleted: boolean; error: string | null }> {
    const path = resolveBrandIconStoragePath(iconUrlOrPath)
    if (!path) return { deleted: true, error: null }

    const { error } = await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([path])
    if (error) return { deleted: false, error: error.message }
    return { deleted: true, error: null }
  },
}
