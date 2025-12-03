import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import AdminList from '@/components/admin/AdminList'

export default function App() {
  const [currentPage, setCurrentPage] = useState('admin')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
      case 'receipts':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Receipts</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
      case 'templates':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Receipt Templates</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
      case 'products':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Products</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
      case 'categories':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
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
