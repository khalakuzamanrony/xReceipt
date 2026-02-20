import { useMemo } from 'react'
import { useBrandSettings } from '@/contexts/BrandSettingsContext'

export default function Header() {
  const { settings } = useBrandSettings()

  const appName = settings?.app_name?.trim() || 'xReceipt'
  const iconUrl = settings?.icon_url || ''

  const initials = useMemo(() => {
    return appName
      .split(' ')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }, [appName])

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="pl-16 pr-6 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={appName}
              className="h-8 w-8 rounded-lg object-cover border border-gray-200 bg-white"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-sm">
              {initials || 'xR'}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-gray-900 truncate">{appName}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
