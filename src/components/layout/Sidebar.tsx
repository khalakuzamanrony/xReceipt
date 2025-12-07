import { useState } from 'react'
import { Menu, X, LayoutDashboard, Package, Folder, FileText, Users, Settings, Store } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { role, permissions } = useAuth()

  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'templates', label: 'Receipt Templates', icon: Settings },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'admin', label: 'Admin', icon: Users },
  ]

  const menuItems = baseMenuItems.filter((item) => {
    if (item.id === 'dashboard') return true

    // Global Grand User can see everything
    if (role === 'grand_user') return true

    // No permissions loaded yet for regular admins
    if (!permissions) return false

    switch (item.id) {
      case 'receipts':
        return permissions.can_view_receipts
      case 'templates':
        return permissions.can_view_templates
      case 'products':
        return permissions.can_view_products
      case 'categories':
        return permissions.can_view_categories
      case 'vendors':
        // Only super admins (handled above) can see this
        return false
      case 'admin':
        // Only super admins (handled above) can see this
        return false
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} className="text-gray-900" /> : <Menu size={24} className="text-gray-900" />}
      </button>

      {/* Sidebar - Desktop & Mobile */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">xReceipt</h2>
          <p className="text-gray-500 text-xs mt-1">Receipt Generator</p>
        </div>

        {/* Menu Items */}
        <nav className="mt-6 space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-gray-500 text-xs text-center">© 2025 xReceipt</p>
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
