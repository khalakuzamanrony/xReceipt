import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  title?: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-lg">
            xR
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">xReceipt</span>
            <span className="text-[11px] text-gray-500 truncate">Receipts & expenses</span>
          </div>
        </div>

        {user && (
          <div className="hidden md:flex flex-col items-end min-w-0">
            <span className="text-[11px] font-medium text-gray-900 truncate">{user.name || 'Admin'}</span>
            <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
          </div>
        )}
      </div>
    </header>
  )
}
