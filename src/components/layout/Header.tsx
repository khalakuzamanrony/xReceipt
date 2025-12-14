import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-lg">
            xR
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-gray-900 truncate">xReceipt</span>
          </div>
        </div>
      </div>
    </header>
  )
}
