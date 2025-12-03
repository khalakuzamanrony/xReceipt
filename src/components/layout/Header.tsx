import { Receipt } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="ml-0 md:ml-64 px-4 md:px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Receipt size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            {description && <p className="text-gray-600 text-sm">{description}</p>}
          </div>
        </div>
      </div>
    </header>
  )
}
