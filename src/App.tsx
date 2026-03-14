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
import SettingsPage from '@/components/settings/SettingsPage'
import { useAuth } from '@/contexts/AuthContext'
import SignInPage from '@/components/auth/SignInPage'
import { Skeleton } from '@/components/ui/Skeleton'

export default function App() {
  const { user, loading, role } = useAuth()
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard'
    const stored = window.localStorage.getItem('xreceipt.currentPage')
    return stored || 'dashboard'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ page?: string }>
      const page = ce?.detail?.page
      if (typeof page === 'string' && page.trim()) {
        setCurrentPage(page)
      }
    }

    window.addEventListener('xreceipt:navigate', handler)
    return () => window.removeEventListener('xreceipt:navigate', handler)
  }, [])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('xreceipt.sidebarCollapsed')
    if (stored === 'true') return true
    if (stored === 'false') return false
    return window.innerWidth < 1024
  })

  const [templateBuilderTemplateId, setTemplateBuilderTemplateId] = useState<string | null>(null)
  const [previousSidebarState, setPreviousSidebarState] = useState<boolean | null>(null)

  // Redirect regular admins (not grand_user or super_admin) from admin page to dashboard
  useEffect(() => {
    if (user && role && role === 'admin' && currentPage === 'admin') {
      setCurrentPage('dashboard')
    }
  }, [user, role, currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('xreceipt.currentPage', currentPage)
  }, [currentPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('xreceipt.sidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Auto-collapse sidebar on desktop only when entering template-builder
  // Remember previous state and restore when leaving
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isDesktop = window.innerWidth >= 1024

    if (isDesktop && currentPage === 'template-builder' && previousSidebarState === null) {
      // Entering template builder - save current state and collapse
      setPreviousSidebarState(sidebarCollapsed)
      if (!sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    } else if (isDesktop && currentPage !== 'template-builder' && previousSidebarState !== null) {
      // Leaving template builder - restore previous state
      setSidebarCollapsed(previousSidebarState)
      setPreviousSidebarState(null)
    }
  }, [currentPage, sidebarCollapsed, previousSidebarState])

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 hidden md:block" />
        <div className="md:ml-64 flex flex-col flex-1 overflow-hidden">
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
            <Skeleton className="h-8 w-40" />
          </div>
          <main className="flex-1 overflow-auto px-6 md:px-8 py-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-72" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-72 w-full" />
            </div>
          </main>
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
        return (
          <TemplateList
            onNavigateToBuilder={(templateId?: string) => {
              setTemplateBuilderTemplateId(templateId ?? null)
              setCurrentPage('template-builder')
            }}
          />
        )
      case 'template-builder':
        return (
          <TemplateBuilderPage
            templateId={templateBuilderTemplateId}
            onBack={() => {
              setTemplateBuilderTemplateId(null)
              setCurrentPage('templates')
            }}
          />
        )
      case 'products':
        return <ProductList />
      case 'categories':
        return <CategoryList />
      case 'vendors':
        return <VendorList />
      case 'settings':
        return <SettingsPage />
      case 'admin':
      default:
        return <AdminList />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Sidebar collapse toggle (between sidebar and header) */}
      {/* Note: Sidebar has its own collapse button now */}

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col flex-1 overflow-hidden`}>
        {/* Header */}
        <Header currentPage={currentPage} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-6 md:px-8 py-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
