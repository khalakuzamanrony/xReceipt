import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/components/dashboard/Dashboard'
import AdminList from '@/components/admin/AdminList'
import ProductList from '@/components/products/ProductList'
import CategoryList from '@/components/categories/CategoryList'
import ReceiptList from '@/components/receipts/ReceiptList'
import TemplateList from '@/components/templates/TemplateList'
import TemplateBuilderPage from '@/components/templates/TemplateBuilderPage'
import VendorList from '@/components/vendors/VendorList'
import { useAuth } from '@/contexts/AuthContext'
import SignInPage from '@/components/auth/SignInPage'

export default function App() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard'
    const stored = window.localStorage.getItem('xreceipt.currentPage')
    return stored || 'dashboard'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('xreceipt.currentPage', currentPage)
  }, [currentPage])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600 text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <SignInPage />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'receipts':
        return <ReceiptList />
      case 'templates':
        return <TemplateList onNavigateToBuilder={() => setCurrentPage('template-builder')} />
      case 'template-builder':
        return <TemplateBuilderPage onBack={() => setCurrentPage('templates')} />
      case 'products':
        return <ProductList />
      case 'categories':
        return <CategoryList />
      case 'vendors':
        return <VendorList />
      case 'admin':
      default:
        return <AdminList />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <div className="md:ml-64 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-6 md:px-8 py-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
