import { useState } from 'react'
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

// Simple logo component with 3 circles
function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
    </div>
  )
}

export default function Sidebar({ currentPage, onPageChange, collapsed, onCollapsedChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, role, loading: authLoading } = useAuth()
  const { memberships, activeVendorId, setActiveVendorId, permissions, permissionsLoading } = useVendor()
  const [vendorSearch, setVendorSearch] = useState('')

  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'templates', label: 'Templates', icon: FileText },
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
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-[#fafafa] border-r border-gray-100 transition-all duration-300 z-40',
          collapsed ? 'w-20' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo and Collapse Button */}
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => onPageChange('dashboard')}
              className={cn('flex items-center hover:bg-gray-100 rounded-lg p-1.5 -m-1.5 transition-colors cursor-pointer', collapsed && 'justify-center w-full')}
              title="Go to Dashboard"
            >
              <LogoIcon className="w-6 h-6" />
            </button>
            {!collapsed && (
              <button
                onClick={() => onCollapsedChange(true)}
                className="hidden md:flex p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => onCollapsedChange(false)}
                className="hidden md:flex p-1.5 hover:bg-gray-200 rounded-md transition-colors absolute -right-3 top-4 bg-white border border-gray-200 shadow-sm"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={14} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* Mobile Close Button */}
          <div className="md:hidden flex justify-end px-4 pb-2">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={20} className="text-gray-700" />
            </button>
          </div>

          {/* Workspace Selector */}
          {showVendorSelector && !collapsed && (
            <div className="px-4 pb-4">
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
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                      {(activeVendor?.name || 'W').charAt(0).toUpperCase()}
                    </div>
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
                          className="px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center gap-2 hover:bg-violet-50 hover:text-violet-700 outline-none data-[state=checked]:bg-violet-50 data-[state=checked]:text-violet-700"
                        >
                          <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {vendor.name.charAt(0).toUpperCase()}
                          </div>
                          <Select.ItemText>{vendor.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          )}

          {collapsed && showVendorSelector && (
            <div className="px-4 pb-4 flex justify-center">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                {(activeVendor?.name || 'W').charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 px-3 py-2 space-y-2">
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
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-violet-100/80 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-violet-600' : 'text-gray-500')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Spacer at bottom */}
          <div className="flex-1" />
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
