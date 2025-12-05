import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { adminService } from '@/services/adminService'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { templateService } from '@/services/templateService'
import { Users, Package, FolderOpen, FileCode } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    admins: 0,
    products: 0,
    categories: 0,
    templates: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const [admins, products, categories, templates] = await Promise.all([
        adminService.getAllAdmins(),
        productService.getAllProducts(),
        categoryService.getAllCategories(),
        templateService.getAllTemplates(),
      ])
      setStats({
        admins: admins.length,
        products: products.length,
        categories: categories.length,
        templates: templates.length,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg">
          <p className="font-semibold">Error loading statistics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Admins Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-gray-500 mt-1">Active administrators</p>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-gray-500 mt-1">Products in catalog</p>
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
            <p className="text-xs text-gray-500 mt-1">Product categories</p>
          </CardContent>
        </Card>

        {/* Templates Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileCode className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.templates}</div>
            <p className="text-xs text-gray-500 mt-1">Receipt templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Welcome to xReceipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-800">
          <p>
            xReceipt is a comprehensive receipt management system that helps you organize and manage your business receipts efficiently.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Admin Management - Create and manage admin accounts with granular permissions</li>
              <li>Product Catalog - Organize products by categories</li>
              <li>Receipt Templates - Create custom receipt templates</li>
              <li>Receipt Generation - Generate and download receipts</li>
              <li>Permission Control - Fine-grained access control for admins</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Create categories for your products</p>
            <p>2. Add products to your catalog</p>
            <p>3. Create receipt templates</p>
            <p>4. Set up admin accounts with permissions</p>
            <p>5. Start generating receipts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database:</span>
              <span className="font-medium">Supabase</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
