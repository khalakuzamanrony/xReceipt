import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useVendor } from '@/contexts/VendorContext'
import { useBrandSettings } from '@/contexts/BrandSettingsContext'
import { useAuth } from '@/contexts/AuthContext'

export default function SettingsPage() {
  const { role } = useAuth()
  const { activeVendorId, memberships } = useVendor()
  const { settings, loading, saving, error, updateBrandInfo, uploadIcon, deleteIcon } = useBrandSettings()

  const vendorName = useMemo(() => {
    if (!activeVendorId) return null
    return memberships.find((m) => m.vendor.id === activeVendorId)?.vendor.name ?? null
  }, [activeVendorId, memberships])

  const [appName, setAppName] = useState('')
  const [tagline, setTagline] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null)
  const [pendingIconPreview, setPendingIconPreview] = useState<string | null>(null)
  const [iconToDelete, setIconToDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAppName(settings?.app_name ?? '')
    setTagline(settings?.tagline ?? '')
    // Clear pending changes when settings refresh
    setPendingIconFile(null)
    setPendingIconPreview(null)
    setIconToDelete(false)
  }, [settings?.app_name, settings?.tagline, settings?.icon_url])

  const canEdit = !!activeVendorId || role === 'grand_user'

  const handleSave = async () => {
    setLocalError(null)
    try {
      await updateBrandInfo({ appName, tagline })

      // Then handle icon changes (so brand info upsert cannot overwrite icon fields)
      if (iconToDelete && !pendingIconFile) {
        await deleteIcon()
      } else if (pendingIconFile) {
        await uploadIcon(pendingIconFile)
      }

      // Clear pending states after successful save
      if (pendingIconPreview) {
        URL.revokeObjectURL(pendingIconPreview)
      }
      setPendingIconFile(null)
      setPendingIconPreview(null)
      setIconToDelete(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  const handleIconSelect = (file: File) => {
    setLocalError(null)
    // Create preview URL
    if (pendingIconPreview) {
      URL.revokeObjectURL(pendingIconPreview)
    }
    const previewUrl = URL.createObjectURL(file)
    setPendingIconFile(file)
    setPendingIconPreview(previewUrl)
    setIconToDelete(false)
  }

  const handleCancelPendingIcon = () => {
    if (pendingIconPreview) {
      URL.revokeObjectURL(pendingIconPreview)
    }
    setPendingIconFile(null)
    setPendingIconPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleIconDeleteRequest = () => {
    setIconToDelete(true)
    setPendingIconFile(null)
    if (pendingIconPreview) {
      URL.revokeObjectURL(pendingIconPreview)
      setPendingIconPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleIconDeleteCancel = () => {
    setIconToDelete(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage app name, tagline, and icon for {vendorName ?? (role === 'grand_user' ? 'the dashboard' : 'your shop')}.
        </p>
      </div>

      {!activeVendorId && role !== 'grand_user' ? (
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
              {role === 'grand_user' && !activeVendorId
                ? 'Update the app name, icon, and tagline. These will apply to the main dashboard when no shop is selected.'
                : 'Update the app name, icon, and tagline. These will apply while this shop is active.'}
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Show pending preview if available, otherwise show saved icon */}
                    {pendingIconPreview ? (
                      <img
                        src={pendingIconPreview}
                        alt="App icon preview"
                        className="h-12 w-12 rounded-xl object-cover border-2 border-dashed border-purple-400 bg-white flex-shrink-0"
                      />
                    ) : iconToDelete ? (
                      <div className="h-12 w-12 rounded-xl border-2 border-dashed border-red-300 bg-red-50 flex items-center justify-center text-xs font-semibold text-red-500 flex-shrink-0">
                        Delete
                      </div>
                    ) : settings?.icon_url ? (
                      <img
                        src={settings.icon_url}
                        alt="App icon"
                        className="h-12 w-12 rounded-xl object-cover border border-gray-200 bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                        No icon
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">App icon</p>
                      <p className="text-xs text-gray-600 mt-0.5 break-words">
                        {pendingIconPreview
                          ? 'New icon selected. Click "Save changes" to upload.'
                          : iconToDelete
                            ? 'Icon will be deleted on save. Click "Cancel delete" to keep it.'
                            : 'Upload a square image (PNG/JPG). Changes apply on save.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pendingIconPreview ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelPendingIcon}
                        disabled={!canEdit || loading || saving}
                      >
                        Cancel
                      </Button>
                    ) : iconToDelete ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleIconDeleteCancel}
                        disabled={!canEdit || loading || saving}
                      >
                        Cancel delete
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!canEdit || loading || saving}
                        >
                          {settings?.icon_url ? 'Change' : 'Upload'}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleIconDeleteRequest}
                          disabled={!settings?.icon_url || !canEdit || loading || saving}
                        >
                          Delete
                        </Button>
                      </>
                    )}
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
                    handleIconSelect(file)
                  }}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!canEdit || loading || saving}
                >
                  {saving
                    ? 'Saving…'
                    : pendingIconFile || iconToDelete
                      ? 'Save changes (with icon)'
                      : 'Save changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
