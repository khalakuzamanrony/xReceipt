import { useState } from 'react'
import { Menu, X, LayoutDashboard, Package, Folder, FileText, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'templates', label: 'Receipt Templates', icon: Settings },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Folder },
    { id: 'admin', label: 'Admin', icon: Users },
  ]

  const handleMenuClick = (pageId: string) => {
    onPageChange(pageId)
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger Button - Mobile */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="default"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Sidebar - Desktop & Mobile */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-950 text-slate-50 border-r border-slate-800 transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            xReceipt
          </h2>
          <p className="text-slate-400 text-xs mt-1">Receipt Generator</p>
        </div>

        {/* Menu Items */}
        <nav className="mt-8 space-y-2 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <Button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  isActive
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <p className="text-slate-400 text-xs text-center">© 2025 xReceipt</p>
        </div>
      </aside>

      {/* Overlay - Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
