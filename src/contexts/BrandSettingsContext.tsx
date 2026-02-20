import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { BrandSettings } from '@/types'
import { useVendor } from '@/contexts/VendorContext'
import { brandSettingsService } from '@/services/brandSettingsService'

interface BrandSettingsContextValue {
  settings: BrandSettings | null
  loading: boolean
  saving: boolean
  error: string | null
  refresh: () => Promise<void>
  updateBrandInfo: (input: { appName: string; tagline: string }) => Promise<void>
  uploadIcon: (file: File) => Promise<void>
  deleteIcon: () => Promise<void>
}

const BrandSettingsContext = createContext<BrandSettingsContextValue | undefined>(undefined)

const DEFAULT_APP_NAME = 'xReceipt'
const DEFAULT_ICON_URL = '/vite.svg'

const applyBrowserBranding = (settings: BrandSettings | null) => {
  if (typeof document === 'undefined') return

  const appName = settings?.app_name?.trim() || DEFAULT_APP_NAME
  const tagline = settings?.tagline?.trim() || ''
  document.title = tagline ? `${appName} - ${tagline}` : appName

  const iconUrl = settings?.icon_url || DEFAULT_ICON_URL

  const setLink = (rel: string) => {
    const selector = `link[rel="${rel}"]`
    const existing = document.querySelector(selector) as HTMLLinkElement | null
    if (existing) {
      existing.href = iconUrl
      return
    }
    const link = document.createElement('link')
    link.rel = rel
    link.href = iconUrl
    document.head.appendChild(link)
  }

  setLink('icon')
  setLink('apple-touch-icon')
}

export function BrandSettingsProvider({ children }: { children: ReactNode }) {
  const { activeVendorId } = useVendor()
  const [settings, setSettings] = useState<BrandSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    if (!activeVendorId) {
      setSettings(null)
      applyBrowserBranding(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await brandSettingsService.getForVendor(activeVendorId)
      setSettings(data)
      applyBrowserBranding(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand settings')
      setSettings(null)
      applyBrowserBranding(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVendorId])

  const updateBrandInfo: BrandSettingsContextValue['updateBrandInfo'] = async ({ appName, tagline }) => {
    if (!activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      const next = await brandSettingsService.upsertForVendor(activeVendorId, {
        app_name: appName.trim() || DEFAULT_APP_NAME,
        tagline: tagline.trim() || null,
        icon_url: settings?.icon_url ?? null,
        icon_path: settings?.icon_path ?? null,
      })
      setSettings(next)
      applyBrowserBranding(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update brand info')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const uploadIcon: BrandSettingsContextValue['uploadIcon'] = async (file) => {
    if (!activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      if (settings?.icon_path || settings?.icon_url) {
        await brandSettingsService.deleteBrandIcon(settings.icon_path || settings.icon_url || '')
      }

      const { publicUrl, path } = await brandSettingsService.uploadBrandIcon(activeVendorId, file)
      const next = await brandSettingsService.upsertForVendor(activeVendorId, {
        app_name: settings?.app_name?.trim() || DEFAULT_APP_NAME,
        tagline: settings?.tagline?.trim() || null,
        icon_url: publicUrl,
        icon_path: path,
      })
      setSettings(next)
      applyBrowserBranding(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload app icon')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const deleteIcon: BrandSettingsContextValue['deleteIcon'] = async () => {
    if (!activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      if (settings?.icon_path || settings?.icon_url) {
        await brandSettingsService.deleteBrandIcon(settings.icon_path || settings.icon_url || '')
      }

      const next = await brandSettingsService.upsertForVendor(activeVendorId, {
        app_name: settings?.app_name?.trim() || DEFAULT_APP_NAME,
        tagline: settings?.tagline?.trim() || null,
        icon_url: null,
        icon_path: null,
      })
      setSettings(next)
      applyBrowserBranding(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app icon')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const value = useMemo<BrandSettingsContextValue>(
    () => ({
      settings,
      loading,
      saving,
      error,
      refresh,
      updateBrandInfo,
      uploadIcon,
      deleteIcon,
    }),
    [settings, loading, saving, error],
  )

  return <BrandSettingsContext.Provider value={value}>{children}</BrandSettingsContext.Provider>
}

export function useBrandSettings() {
  const ctx = useContext(BrandSettingsContext)
  if (!ctx) throw new Error('useBrandSettings must be used within a BrandSettingsProvider')
  return ctx
}
