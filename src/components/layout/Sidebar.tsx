import { useEffect, useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Folder,
  FileText,
  Users,
  Settings,
  Store,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import { Input } from '@/components/ui/Input'
import * as Select from '@radix-ui/react-select'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export default function Sidebar({ currentPage, onPageChange, collapsed, onCollapsedChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, role, signOut } = useAuth()
  const { memberships, activeVendorId, setActiveVendorId, permissions, permissionsLoading } = useVendor()
  const [vendorSearch, setVendorSearch] = useState('')
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('')

  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'templates', label: 'Receipt Templates', icon: Settings },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'vendors', label: 'Shops', icon: Store },
    { id: 'admin', label: 'Admin', icon: Users },
  ]

  const hasAnyVendorMembership = memberships.length > 0
  const isVendorSuperAdmin = memberships.some((m) => m.isVendorSuperAdmin)
  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const vendors = memberships.map((m) => m.vendor)
  const hasVendors = vendors.length > 0
  const isGrandUser = role === 'grand_user'
  const showVendorSelector = !!user && hasVendors

  const filteredMemberships = memberships.filter(({ vendor }) =>
    vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()),
  )

  const selectValue = isGrandUser ? (activeVendorId ?? '__all__') : (activeVendorId ?? '')

  const activeVendor = activeVendorId ? vendors.find((v) => v.id === activeVendorId) ?? null : null

  const userInitials = (() => {
    const source = user?.name || user?.email || 'U'
    return source
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  })()

  useEffect(() => {
    const resolveStoragePath = (value: string) => {
      if (!value) return ''
      if (value.startsWith('data:')) return ''
      const markers = [
        '/storage/v1/object/sign/admin-profiles/',
        '/storage/v1/object/public/admin-profiles/',
        '/storage/v1/object/admin-profiles/',
        'admin-profiles/',
      ]

      for (const marker of markers) {
        const idx = value.indexOf(marker)
        if (idx >= 0) {
          const extracted = value.slice(idx + marker.length)
          return extracted.split('?')[0].split('#')[0]
        }
      }

      if (!value.startsWith('http') && value.includes('/')) return value.split('?')[0].split('#')[0]
      return ''
    }

    const run = async () => {
      const raw = user?.profile_image_url || ''
      if (!raw) {
        setUserAvatarUrl('')
        return
      }

      const hasSafeRawAvatar =
        raw.startsWith('http') && !raw.includes('/storage/v1/object/sign/admin-profiles/')

      const path = resolveStoragePath(raw)
      if (!path) {
        setUserAvatarUrl(raw)
        return
      }

      try {
        const { data, error } = await supabase.storage.from('admin-profiles').createSignedUrl(path, 60 * 60)
        if (error || !data?.signedUrl) {
          setUserAvatarUrl(hasSafeRawAvatar ? raw : '')
          return
        }
        setUserAvatarUrl(data.signedUrl)
      } catch {
        setUserAvatarUrl(hasSafeRawAvatar ? raw : '')
      }
    }

    void run()
  }, [user?.profile_image_url])

  const menuItems = baseMenuItems.filter((item) => {
    if (item.id === 'dashboard') return true

    // Global Grand User can see everything
    if (role === 'grand_user') return true

    // While loading shop-scoped permissions, avoid rendering an empty sidebar for admins.
    // Feature pages still enforce permissions.
    if (role === 'admin' && permissionsLoading) {
      if (item.id === 'vendors') return hasAnyVendorMembership
      return true
    }

    // Vendor super admins should see the full vendor-scoped menu for the active shop.
    if (isVendorSuperAdminForActiveVendor) {
      if (item.id === 'admin') return true
      if (item.id === 'vendors') return hasAnyVendorMembership
      return true
    }

    switch (item.id) {
      case 'receipts':
        return !!permissions?.can_view_receipts
      case 'templates':
        return !!permissions?.can_view_templates
      case 'products':
        return !!permissions?.can_view_products
      case 'categories':
        return !!permissions?.can_view_categories
      case 'vendors':
        // Any user with vendor memberships can see Vendors
        return hasAnyVendorMembership
      case 'admin':
        // Vendor super admins get Admin access scoped to their vendors
        return isVendorSuperAdmin
      default:
        return true
    }
  })

  const handleMenuClick = (pageId: string) => {
    onPageChange(pageId)
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger Button - Mobile */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-2 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-gray-900" />
        </button>
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40',
          'w-64',
          collapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button inside panel (prevents overlap with vendor selector) */}
          <div className="md:hidden flex justify-end px-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X size={22} className="text-gray-900" />
            </button>
          </div>

          {/* Vendor selector card at top */}
          {showVendorSelector && (
            <div className="px-4 pt-5 pb-4 border-b border-gray-200">
              <Select.Root
                value={selectValue}
                onValueChange={(value) => {
                  if (isGrandUser && value === '__all__') {
                    setActiveVendorId(null)
                  } else {
                    setActiveVendorId(value || null)
                  }
                }}
              >
                <Select.Trigger
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                    collapsed ? 'md:px-2 md:justify-center' : undefined,
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {activeVendor?.image_url ? (
                      <img
                        src={activeVendor.image_url}
                        alt={activeVendor.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-[11px] font-semibold text-blue-700">
                        {(activeVendor?.name || 'VR')
                          .split(' ')
                          .filter(Boolean)
                          .map((part) => part.charAt(0).toUpperCase())
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                    <div className={cn('flex flex-col min-w-0 text-left', collapsed ? 'md:hidden' : undefined)}>
                      <span className="text-[12px] font-semibold text-gray-900 truncate">
                        <Select.Value placeholder={isGrandUser ? 'All shops' : 'Select shop'} />
                      </span>
                      <span className="text-[11px] text-gray-500 truncate">
                        {isGrandUser && !activeVendorId
                          ? 'Global workspace'
                          : activeVendor
                          ? 'Active workspace'
                          : 'No shop selected'}
                      </span>
                    </div>
                  </div>
                  <Select.Icon className={cn(collapsed ? 'md:hidden' : undefined)}>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={6}
                    className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                    style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                  >
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                      <Input
                        type="text"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        placeholder="Search shops..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                      {isGrandUser && (
                        <Select.Item
                          value="__all__"
                          className="px-3 py-1.5 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                        >
                          <Select.ItemText>All shops</Select.ItemText>
                        </Select.Item>
                      )}
                      {filteredMemberships.map(({ vendor }) => (
                        <Select.Item
                          key={vendor.id}
                          value={vendor.id}
                          className="px-3 py-1.5 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                        >
                          <Select.ItemText>{vendor.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          {/* Collapse toggle (tablet/desktop) */}
          <div className={cn('hidden md:flex px-3 pt-3', collapsed ? 'justify-center' : 'justify-end')}>
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} className="text-gray-700" /> : <ChevronLeft size={18} className="text-gray-700" />}
            </button>
          </div>

          {/* Menu Items */}
          <nav className="mt-5 flex-1 overflow-y-auto px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              const label = item.id === 'admin' && role === 'grand_user' ? 'Users' : item.label

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={cn(
                    'w-full relative group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm cursor-pointer',
                    collapsed ? 'md:justify-center md:px-0' : undefined,
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className={cn('truncate', collapsed ? 'md:hidden' : undefined)}>{label}</span>

                  {/* Hover label when collapsed (tablet/desktop) */}
                  {collapsed && (
                    <span className="hidden md:group-hover:flex absolute left-[4.75rem] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 shadow-lg">
                      {label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer with profile dropup */}
          <div className="border-t border-gray-200 px-4 py-3 mt-2">
            {user && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 cursor-pointer',
                      collapsed ? 'md:justify-center md:px-0' : undefined,
                    )}
                    title={collapsed ? (user.name || user.email || 'Admin') : undefined}
                  >
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={user.name || user.email}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-600/10 flex items-center justify-center text-xs font-semibold text-blue-700">
                        {userInitials}
                      </div>
                    )}
                    <div className={cn('flex flex-col min-w-0 text-left', collapsed ? 'md:hidden' : undefined)}>
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{user.name || 'Admin'}</span>
                      <span className="text-[11px] text-gray-500 truncate">
                        {activeVendor ? activeVendor.name : isGrandUser ? 'All shops' : 'No shop selected'}
                      </span>
                    </div>
                    <ChevronDown className={cn('h-3 w-3 text-gray-400 ml-auto', collapsed ? 'md:hidden' : undefined)} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    align="start"
                    className="min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-1 mb-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">{user.name || 'Admin'}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>
                    <DropdownMenu.Item
                      onSelect={(event) => {
                        event.preventDefault()
                        void signOut()
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign out</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
            <p className="text-gray-400 text-[10px] text-center mt-2">© 2025 xReceipt</p>
          </div>
        </div>
      </aside>

      {/* Overlay - Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
