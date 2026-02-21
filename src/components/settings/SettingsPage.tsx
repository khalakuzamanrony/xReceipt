import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useVendor } from '@/contexts/VendorContext'
import { useBrandSettings } from '@/contexts/BrandSettingsContext'

export default function SettingsPage() {
  const { activeVendorId, memberships } = useVendor()
  const { settings, loading, saving, error, updateBrandInfo, uploadIcon, deleteIcon } = useBrandSettings()

  const vendorName = useMemo(() => {
    if (!activeVendorId) return null
    return memberships.find((m) => m.vendor.id === activeVendorId)?.vendor.name ?? null
  }, [activeVendorId, memberships])

  const [appName, setAppName] = useState('')
  const [tagline, setTagline] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAppName(settings?.app_name ?? '')
    setTagline(settings?.tagline ?? '')
  }, [settings?.app_name, settings?.tagline])

  const canEdit = !!activeVendorId

  const handleSave = async () => {
    setLocalError(null)
    try {
      await updateBrandInfo({ appName, tagline })
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  const handleIconUpload = async (file: File) => {
    setLocalError(null)
    try {
      await uploadIcon(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to upload icon')
    }
  }

  const handleIconDelete = async () => {
    setLocalError(null)
    try {
      await deleteIcon()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete icon')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your shop settings{vendorName ? ` for ${vendorName}` : ''}.
        </p>
      </div>

      {!activeVendorId ? (
        <Card>
          <CardHeader>
            <CardTitle>Brand Info</CardTitle>
            <CardDescription>Select a shop to edit its branding.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">Use the shop selector at the top-left.</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Brand Info</CardTitle>
            <CardDescription>
              Update the app name, icon, and tagline. These will apply while this shop is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {(error || localError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {localError || error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="brand-app-name" required>
                    App name
                  </Label>
                  <Input
                    id="brand-app-name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. My Shop"
                    disabled={!canEdit || loading || saving}
                  />
                  <p className="text-xs text-gray-500">Shown in the header and navigation.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-tagline">Tagline</Label>
                  <Input
                    id="brand-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Receipt generator"
                    disabled={!canEdit || loading || saving}
                  />
                  <p className="text-xs text-gray-500">Shown in the browser tab title.</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {settings?.icon_url ? (
                      <img
                        src={settings.icon_url}
                        alt="App icon"
                        className="h-12 w-12 rounded-xl object-cover border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-xs font-semibold text-gray-500">
                        No icon
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">App icon</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Upload a square image (PNG/JPG). It will be stored in Supabase Storage.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canEdit || loading || saving}
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleIconDelete}
                      disabled={!settings?.icon_url || !canEdit || loading || saving}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    void handleIconUpload(file)
                  }}
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSave} disabled={!canEdit || loading || saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
