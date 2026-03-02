import { useAuth } from '@/contexts/AuthContext'
import { ChevronDown, LogOut } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useToast } from '@/contexts/ToastContext'

interface HeaderProps {
  currentPage: string
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  receipts: 'Receipts',
  templates: 'Receipt Templates',
  'template-builder': 'Template Builder',
  products: 'Products',
  categories: 'Categories',
  vendors: 'Shops',
  settings: 'Settings',
  admin: 'Admin Management',
}

export default function Header({ currentPage }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const pageTitle = PAGE_TITLES[currentPage] || 'xReceipt'

  const userInitials = (() => {
    const source = user?.name || user?.email || 'U'
    return source
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  })()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="pl-14 pr-6 md:px-8 py-3 flex items-center justify-between gap-4">
        <span className="text-lg font-bold text-gray-900 truncate">{pageTitle}</span>
        {user && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                  {userInitials}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="bottom"
                align="end"
                className="min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg p-1 z-50"
              >
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-violet-600 font-medium mt-1 capitalize">{(user.role || 'user').replace(/_/g, ' ')}</p>
                </div>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault()
                    void signOut().then(() => {
                      toast('Signed out', 'You have been signed out.', 'success')
                    })
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  )
}
