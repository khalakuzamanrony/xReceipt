import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/components/dashboard/Dashboard'
import AdminList from '@/components/admin/AdminList'
import ProductList from '@/components/products/ProductList'
import CategoryList from '@/components/categories/CategoryList'
import ReceiptList from '@/components/receipts/ReceiptList'
import TemplateList from '@/components/templates/TemplateList'
import TemplateBuilderPage from '@/components/templates/TemplateBuilderPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState('admin')

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
      case 'admin':
      default:
        return <AdminList />
    }
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'dashboard': 'Dashboard',
      'receipts': 'Receipts',
      'templates': 'Receipt Templates',
      'template-builder': 'Template Builder',
      'products': 'Products',
      'categories': 'Categories',
      'admin': 'Admin',
    }
    return titles[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <div className="md:ml-64 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header title={getPageTitle()} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-6 md:px-8 py-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
