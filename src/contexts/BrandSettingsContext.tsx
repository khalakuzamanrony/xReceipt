import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { BrandSettings } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
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

let manifestObjectUrl: string | null = null

const applyBrowserBranding = (settings: BrandSettings | null) => {
  if (typeof document === 'undefined') return

  const appName = settings?.app_name?.trim() || DEFAULT_APP_NAME
  const tagline = settings?.tagline?.trim() || ''
  document.title = tagline ? `${appName} - ${tagline}` : appName

  const iconUrl = settings?.icon_url || DEFAULT_ICON_URL
  const cacheKey = settings?.updated_at ? new Date(settings.updated_at).getTime() : Date.now()

  const withCacheBust = (url: string) => {
    if (!url) return url
    const joiner = url.includes('?') ? '&' : '?'
    return `${url}${joiner}v=${cacheKey}`
  }

  const iconHref = withCacheBust(iconUrl)

  const setMeta = (name: string, content: string) => {
    const selector = `meta[name="${name}"]`
    const existing = document.querySelector(selector) as HTMLMetaElement | null
    if (existing) {
      existing.content = content
      return
    }
    const meta = document.createElement('meta')
    meta.name = name
    meta.content = content
    document.head.appendChild(meta)
  }

  setMeta('application-name', appName)
  setMeta('apple-mobile-web-app-title', appName)

  const setLink = (rel: string) => {
    const selector = `link[rel="${rel}"]`
    const existingLinks = Array.from(document.querySelectorAll(selector)) as HTMLLinkElement[]
    if (existingLinks.length > 0) {
      existingLinks.forEach((link) => {
        link.href = iconHref
      })
      return
    }
    const link = document.createElement('link')
    link.rel = rel
    link.href = iconHref
    document.head.appendChild(link)
  }

  setLink('icon')
  setLink('shortcut icon')
  setLink('apple-touch-icon')

  // Update PWA manifest dynamically (name + icons) so global branding reflects when all workspaces selected.
  try {
    const manifest = {
      name: appName,
      short_name: appName,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#7c3aed',
      icons: [
        { src: iconHref, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: iconHref, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const nextUrl = URL.createObjectURL(blob)

    const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    if (existing) {
      existing.href = nextUrl
    } else {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = nextUrl
      document.head.appendChild(link)
    }

    if (manifestObjectUrl) {
      URL.revokeObjectURL(manifestObjectUrl)
    }
    manifestObjectUrl = nextUrl
  } catch {
    // Ignore manifest update failures.
  }
}

export function BrandSettingsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const { activeVendorId } = useVendor()
  const [settings, setSettings] = useState<BrandSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scope: 'vendor' | 'global' = role === 'grand_user' && !activeVendorId ? 'global' : 'vendor'

  const refresh = async () => {
    if (!activeVendorId && scope === 'vendor') {
      setSettings(null)
      applyBrowserBranding(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data =
        scope === 'global'
          ? await brandSettingsService.getGlobal()
          : await brandSettingsService.getForVendor(activeVendorId as string)
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
  }, [activeVendorId, role])

  const updateBrandInfo: BrandSettingsContextValue['updateBrandInfo'] = async ({ appName, tagline }) => {
    if (scope === 'vendor' && !activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      const next =
        scope === 'global'
          ? await brandSettingsService.upsertBrandInfoGlobal({
              app_name: appName.trim() || DEFAULT_APP_NAME,
              tagline: tagline.trim() || null,
            })
          : await brandSettingsService.upsertBrandInfoForVendor(activeVendorId as string, {
              app_name: appName.trim() || DEFAULT_APP_NAME,
              tagline: tagline.trim() || null,
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
    if (scope === 'vendor' && !activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      const { publicUrl, path } = await brandSettingsService.uploadBrandIcon({
        scope,
        vendorId: activeVendorId,
        file,
      })

      const next =
        scope === 'global'
          ? await brandSettingsService.upsertBrandIconGlobal({ icon_url: publicUrl, icon_path: path })
          : await brandSettingsService.upsertBrandIconForVendor(activeVendorId as string, {
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
    if (scope === 'vendor' && !activeVendorId) throw new Error('Please select a shop first.')

    setSaving(true)
    setError(null)
    try {
      if (settings?.icon_path || settings?.icon_url) {
        await brandSettingsService.deleteBrandIcon(settings.icon_path || settings.icon_url || '')
      }

      const next =
        scope === 'global'
          ? await brandSettingsService.upsertBrandIconGlobal({ icon_url: null, icon_path: null })
          : await brandSettingsService.upsertBrandIconForVendor(activeVendorId as string, {
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
