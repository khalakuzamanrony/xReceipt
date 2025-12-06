import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut } from 'lucide-react'

interface HeaderProps {
  title?: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          {title && <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>}
          {description && <p className="text-gray-600 text-sm truncate">{description}</p>}
        </div>

        {user && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 flex items-center gap-2 rounded-full"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold flex items-center justify-center">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start leading-tight max-w-[160px]">
                  <span className="text-[11px] font-medium text-gray-900 truncate">{user.name || 'Admin'}</span>
                  <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-1 mr-4 mt-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900 truncate">{user.name || 'Admin'}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                </div>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    // Prevent focusing issues
                    ;(event?.preventDefault?.())
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
      </div>
    </header>
  )
}
