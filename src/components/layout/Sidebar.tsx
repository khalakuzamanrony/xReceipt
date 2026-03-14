import { useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Folder,
  FileText,
  FileCode,
  Users,
  Settings,
  Store,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import { Input } from '@/components/ui/Input'
import * as Select from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

function WorkspaceAvatar({
  name,
  imageUrl,
  className,
}: {
  name: string
  imageUrl?: string | null
  className?: string
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn('rounded-lg object-cover bg-gray-50 ring-1 ring-gray-200', className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium',
        className,
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Sidebar({ currentPage, onPageChange, collapsed, onCollapsedChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, role, loading: authLoading } = useAuth()
  const { memberships, activeVendorId, setActiveVendorId, permissions, permissionsLoading } = useVendor()
  const [vendorSearch, setVendorSearch] = useState('')

  const showLabels = !collapsed || isOpen

  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'templates', label: 'Templates', icon: FileCode },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'vendors', label: 'Shops', icon: Store },
    { id: 'admin', label: 'Admin', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const isVendorSuperAdmin = memberships.some((m) => m.isVendorSuperAdmin)
  const isVendorSuperAdminForActiveVendor =
    (role === 'admin' || role === 'super_admin') &&
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

  const menuItems = baseMenuItems.filter((item) => {
    // During auth loading, only show dashboard
    if (authLoading) {
      return item.id === 'dashboard'
    }

    if (item.id === 'dashboard') return true

    // Global Grand User can see everything
    if (role === 'grand_user') return true

    // For admins, wait until permissions are loaded before showing menu items
    if ((role === 'admin' || role === 'super_admin') && permissionsLoading) {
      // Only show dashboard while loading permissions
      return item.id === 'dashboard'
    }

    // Vendor super admins should see the full vendor-scoped menu for the active shop.
    if (isVendorSuperAdminForActiveVendor) {
      if (item.id === 'admin') return true
      if (item.id === 'vendors') return false
      return true
    }

    switch (item.id) {
      case 'receipts':
        return !!permissions?.can_view_receipts
      case 'templates':
        return isVendorSuperAdminForActiveVendor
      case 'products':
        return !!permissions?.can_view_products
      case 'categories':
        return !!permissions?.can_view_categories
      case 'vendors':
        return false
      case 'settings':
        return false
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
      {/* Mobile Hamburger - only show when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-[#fafafa] border-r border-gray-100 transition-all duration-300 z-40',
          // Mobile: always w-64 when open; Desktop: use collapsed prop
          isOpen ? 'w-64' : (collapsed ? 'w-20' : 'w-64'),
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header: Workspace selector */}
          {showVendorSelector && (
            <div
              className={cn(
                'border-b border-gray-200/60 h-16 px-4 flex items-center relative',
              )}
            >
              <div
                className={cn(
                  'relative flex items-center gap-3',
                  collapsed && !isOpen ? 'justify-center' : 'justify-between',
                )}
                style={{ width: '100%' }}
              >
                {/* Selector */}
                {collapsed && !isOpen ? (
                  <Select.Root
                    value={selectValue}
                    onValueChange={(value) => {
                      if (value === '__all__') {
                        setActiveVendorId(null)
                      } else {
                        setActiveVendorId(value || null)
                      }
                    }}
                  >
                    <Select.Trigger
                      className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium hover:from-violet-600 hover:to-purple-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      aria-label="Select workspace"
                    >
                      {activeVendor?.image_url ? (
                        <img
                          src={activeVendor.image_url}
                          alt={activeVendor.name}
                          className="w-8 h-8 rounded-md object-cover bg-gray-50"
                        />
                      ) : (
                        (activeVendor?.name || 'W').charAt(0).toUpperCase()
                      )}
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        position="popper"
                        sideOffset={8}
                        align="start"
                        className="z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                          <Input
                            type="text"
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            placeholder="Search workspaces..."
                            className="h-8 text-xs"
                          />
                        </div>
                        <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                          {isGrandUser && (
                            <Select.Item
                              value="__all__"
                              className="px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center gap-2 hover:bg-violet-50 hover:text-violet-700 outline-none data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700"
                            >
                              <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs">A</div>
                              <Select.ItemText>All workspaces</Select.ItemText>
                            </Select.Item>
                          )}
                          {filteredMemberships.map(({ vendor }) => (
                            <Select.Item
                              key={vendor.id}
                              value={vendor.id}
                              disabled={!isGrandUser && vendor.status === 'inactive'}
                              className={cn(
                                'px-3 py-2 text-sm flex items-center gap-2 outline-none',
                                vendor.status === 'inactive'
                                  ? isGrandUser
                                    ? 'text-gray-500 cursor-pointer hover:bg-violet-50 hover:text-violet-700 data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700'
                                    : 'text-gray-400 cursor-not-allowed data-[state=checked]:bg-transparent data-[state=checked]:text-gray-400'
                                  : 'text-gray-700 cursor-pointer hover:bg-violet-50 hover:text-violet-700 data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700',
                              )}
                            >
                              <WorkspaceAvatar name={vendor.name} imageUrl={vendor.image_url} className="w-5 h-5" />
                              {vendor.status === 'inactive' && <Ban size={14} className="text-gray-400" />}
                              <Select.ItemText>{vendor.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                ) : (
                  <Select.Root
                    value={selectValue}
                    onValueChange={(value) => {
                      if (value === '__all__') {
                        setActiveVendorId(null)
                      } else {
                        setActiveVendorId(value || null)
                      }
                    }}
                  >
                    <Select.Trigger className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500">
                      <div className="flex items-center gap-2 min-w-0">
                        <WorkspaceAvatar
                          name={activeVendor?.name || 'Workspace'}
                          imageUrl={activeVendor?.image_url}
                          className="w-8 h-8 flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          <Select.Value placeholder="My Workspace" />
                        </span>
                      </div>
                      <Select.Icon>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        position="popper"
                        sideOffset={4}
                        className="z-50 w-[var(--radix-select-trigger-width)] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                          <Input
                            type="text"
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            placeholder="Search workspaces..."
                            className="h-8 text-xs"
                          />
                        </div>
                        <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                          {isGrandUser && (
                            <Select.Item
                              value="__all__"
                              className="px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center gap-2 hover:bg-violet-50 hover:text-violet-700 outline-none data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700"
                            >
                              <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs">A</div>
                              <Select.ItemText>All workspaces</Select.ItemText>
                            </Select.Item>
                          )}
                          {filteredMemberships.map(({ vendor }) => (
                            <Select.Item
                              key={vendor.id}
                              value={vendor.id}
                              disabled={!isGrandUser && vendor.status === 'inactive'}
                              className={cn(
                                'px-3 py-2 text-sm flex items-center gap-2 outline-none',
                                vendor.status === 'inactive'
                                  ? isGrandUser
                                    ? 'text-gray-500 cursor-pointer hover:bg-violet-50 hover:text-violet-700 data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700'
                                    : 'text-gray-400 cursor-not-allowed data-[state=checked]:bg-transparent data-[state=checked]:text-gray-400'
                                  : 'text-gray-700 cursor-pointer hover:bg-violet-50 hover:text-violet-700 data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700',
                              )}
                            >
                              <WorkspaceAvatar name={vendor.name} imageUrl={vendor.image_url} className="w-5 h-5" />
                              {vendor.status === 'inactive' && <Ban size={14} className="text-gray-400" />}
                              <Select.ItemText>{vendor.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}

                {/* Controls */}
                {isOpen && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors md:hidden"
                    aria-label="Close menu"
                  >
                    <X size={20} className="text-gray-700" />
                  </button>
                )}
              </div>

              {!isOpen && (
                <button
                  onClick={() => onCollapsedChange(!collapsed)}
                  className="hidden md:flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-white shadow-sm absolute -right-3 top-1/2 -translate-y-1/2 hover:bg-gray-50 transition-colors"
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? (
                    <ChevronRight size={14} className="text-gray-600" />
                  ) : (
                    <ChevronLeft size={14} className="text-gray-600" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto min-h-0">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              const label = item.id === 'admin' && role === 'grand_user' ? 'Users' : item.label

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium',
                    showLabels ? 'justify-start' : 'justify-center',
                    isActive
                      ? 'bg-violet-100/80 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                  title={!showLabels ? label : undefined}
                >
                  <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-violet-600' : 'text-gray-500')} />
                  {showLabels ? <span className="truncate">{label}</span> : null}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
