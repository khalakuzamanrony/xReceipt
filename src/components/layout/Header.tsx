interface HeaderProps {
  title?: string
  description?: string
}

export default function Header({ title, description }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="ml-0 md:ml-64 px-6 md:px-8 py-6 flex items-center justify-start">
        <div className="flex flex-col gap-0.5">
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
          {description && <p className="text-gray-600 text-sm">{description}</p>}
        </div>
      </div>
    </header>
  )
}
