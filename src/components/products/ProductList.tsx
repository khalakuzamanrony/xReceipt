import { useEffect, useState } from 'react'
import type { Product } from '@/types'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, AlertCircle, Package, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'

export default function ProductList() {
  const { role, permissions } = useAuth()
  const canViewProducts = role === 'grand_user' || !!permissions?.can_view_products
  const canCreateProducts = role === 'grand_user' || !!permissions?.can_create_products
  const { activeVendorId, loading: vendorLoading } = useVendor()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  useEffect(() => {
    if (vendorLoading) return

    if (role === 'admin' && !activeVendorId) {
      setProducts([])
      setCategories([])
      setLoading(false)
      return
    }

    void loadData(activeVendorId)
  }, [vendorLoading, activeVendorId, role])

  const loadData = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)

      const vendorFilter = vendorId ?? undefined
      const [productsData, categoriesData] = await Promise.all([
        productService.getAllProducts(vendorFilter),
        categoryService.getAllCategories(vendorFilter),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + rowsPerPage)

  const handleAddNew = () => {
    // Require a vendor selection before creating products
    if (!activeVendorId) {
      setError('Please select a vendor from the header before creating products.')
      return
    }

    setSelectedProduct(null)
    setFormData({ name: '', description: '', price: '', category_id: '' })
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await productService.deleteProduct(id)
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price || !formData.category_id) {
      setError('Please fill in all required fields')
      return
    }

    const isNew = !selectedProduct

    // New products must always be tied to a specific vendor
    if (isNew && !activeVendorId) {
      setError('Please select a vendor from the header before creating products.')
      return
    }

    try {
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
      }

      if (isNew && activeVendorId) {
        productData.vendor_id = activeVendorId
      }

      if (selectedProduct) {
        await productService.updateProduct(selectedProduct.id, productData)
      } else {
        await productService.createProduct(productData)
      }

      setShowForm(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown'
  }

  if (loading || vendorLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading products...</p>
      </div>
    )
  }

  if (!canViewProducts) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Products</p>
        <p className="text-gray-500 text-sm mt-1">Contact a Grand User if you think this is a mistake.</p>
      </div>
    )
  }

  if (role === 'admin' && !activeVendorId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">No vendor assigned</p>
        <p className="text-gray-500 text-sm mt-1">You are not assigned to any vendor. Please contact a Grand User.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            {/* Add Button */}
            {canCreateProducts && (
              <Button onClick={handleAddNew} size="sm">
                <Plus size={16} />
                Add Product
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900">Product Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-900">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-semibold text-gray-900">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-900">Category *</Label>
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <DialogFooter className="gap-3 border-t border-gray-200 pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {selectedProduct ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <Package size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No products found' : 'No products yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first product to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {product.description || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {getCategoryName(product.category_id)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-gray-900">${product.price.toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {totalProducts === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalProducts)} of {totalProducts}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 10
                    setRowsPerPage(value)
                    setPage(1)
                  }}
                  className="h-7 border border-gray-300 rounded-md text-xs text-gray-900 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
