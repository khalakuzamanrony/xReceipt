import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/components/dashboard/Dashboard'
import AdminList from '@/components/admin/AdminList'
import ProductList from '@/components/products/ProductList'
import CategoryList from '@/components/categories/CategoryList'
import ReceiptList from '@/components/receipts/ReceiptList'
import TemplateList from '@/components/templates/TemplateList'

export default function App() {
  const [currentPage, setCurrentPage] = useState('admin')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'receipts':
        return <ReceiptList />
      case 'templates':
        return <TemplateList />
      case 'products':
        return <ProductList />
      case 'categories':
        return <CategoryList />
      case 'admin':
      default:
        return <AdminList />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header */}
        <Header
          title={currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
          description="Manage your receipt system"
        />

        {/* Page Content */}
        <main className="px-4 md:px-8 py-8">
          {renderPage()}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="px-4 md:px-8 py-6 text-center text-gray-600 text-sm">
            <p>© 2025 xReceipt. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
