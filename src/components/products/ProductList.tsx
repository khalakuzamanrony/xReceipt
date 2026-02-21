import { useEffect, useState } from 'react'
import type { Product, Vendor } from '@/types'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { receiptService } from '@/services/receiptService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, AlertCircle, Package, Search, ArrowUpDown, Funnel, ChevronDown, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Select from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export default function ProductList() {
  const { role } = useAuth()
  const { memberships, activeVendorId, permissions, loading: vendorLoading } = useVendor()

  const isGrandUserAllShops = role === 'grand_user' && !activeVendorId

  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const canViewProducts = role === 'grand_user' || isVendorSuperAdminForActiveVendor || !!permissions?.can_view_products
  const canCreateProducts = role === 'grand_user' || isVendorSuperAdminForActiveVendor || !!permissions?.can_create_products
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
    imei_or_model: '',
    color: '',
    tax_enabled: true,
    tax_percentage: '0',
    discount_enabled: false,
    discount_type: 'none' as 'none' | 'percentage' | 'flat',
    discount_value: '0',
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [priceSortDirection, setPriceSortDirection] = useState<'asc' | 'desc'>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [productSoldCounts, setProductSoldCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (vendorLoading) return

    if (!activeVendorId && !isGrandUserAllShops) {
      setProducts([])
      setCategories([])
      setLoading(false)
      return
    }

    void loadData(activeVendorId ?? null)
  }, [vendorLoading, activeVendorId, role])

  const vendors: Vendor[] = memberships.map((m) => m.vendor)

  const getAssignedVendorForProduct = (product: Product): Vendor | null => {
    if (!product.vendor_id) return null
    return vendors.find((v) => v.id === product.vendor_id) || null
  }

  const buildVendorInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')

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

      const productIds = productsData.map((p) => p.id)
      if (productIds.length > 0) {
        try {
          const counts = await receiptService.getSoldCountsByProductIds(productIds, vendorId ?? null)
          setProductSoldCounts(counts)
        } catch (countErr) {
          console.error('Failed to load product sold counts', countErr)
          setProductSoldCounts({})
        }
      } else {
        setProductSoldCounts({})
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const assignedProductIds = permissions?.assigned_product_ids || []
  const permissionFilteredProducts =
    role === 'admin' &&
    !isVendorSuperAdminForActiveVendor &&
    permissions?.can_view_products &&
    assignedProductIds.length > 0
      ? products.filter((product) => assignedProductIds.includes(product.id))
      : products

  const searchFilteredProducts = permissionFilteredProducts.filter((product) => {
    const term = searchTerm.toLowerCase()
    const nameMatch = product.name.toLowerCase().includes(term)
    const descriptionMatch = product.description
      ? product.description.toLowerCase().includes(term)
      : false

    return nameMatch || descriptionMatch
  })

  let filteredProducts = searchFilteredProducts

  if (categoryFilter !== 'all') {
    filteredProducts = filteredProducts.filter((product) => product.category_id === categoryFilter)
  }

  if (dateRangeFilter !== 'all') {
    const now = new Date()

    filteredProducts = filteredProducts.filter((product) => {
      const created = new Date(product.created_at)
      if (Number.isNaN(created.getTime())) return false

      if (dateRangeFilter === 'today') {
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        )
      }

      const diffMs = now.getTime() - created.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (dateRangeFilter === '7d') {
        return diffDays <= 7
      }

      if (dateRangeFilter === '30d') {
        return diffDays <= 30
      }

      return true
    })
  }

  const minPriceValue = minPrice.trim() !== '' ? Number(minPrice) : null
  const maxPriceValue = maxPrice.trim() !== '' ? Number(maxPrice) : null

  if (minPriceValue !== null && !Number.isNaN(minPriceValue)) {
    filteredProducts = filteredProducts.filter((product) => product.price >= minPriceValue)
  }

  if (maxPriceValue !== null && !Number.isNaN(maxPriceValue)) {
    filteredProducts = filteredProducts.filter((product) => product.price <= maxPriceValue)
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceDelta = priceSortDirection === 'asc' ? a.price - b.price : b.price - a.price
    if (priceDelta !== 0) return priceDelta
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  const totalProducts = sortedProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedProducts = sortedProducts.slice(startIndex, startIndex + rowsPerPage)

  const handleAddNew = () => {
    // Require a vendor selection before creating products
    if (!activeVendorId) {
      setError('Please select a shop from the header before creating products.')
      return
    }

    setSelectedProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      imei_or_model: '',
      color: '',
      tax_enabled: true,
      tax_percentage: '0',
      discount_enabled: false,
      discount_type: 'none',
      discount_value: '0',
    })
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id,
      imei_or_model: product.imei_or_model ? String(product.imei_or_model) : '',
      color: product.color ? String(product.color) : '',
      tax_enabled: product.tax_enabled ?? true,
      tax_percentage: String(product.tax_percentage ?? 0),
      discount_enabled: product.discount_enabled ?? false,
      discount_type: product.discount_type ?? 'none',
      discount_value: String(product.discount_value ?? 0),
    })
    setShowForm(true)
  }

  const handleRequestDelete = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)
      await productService.deleteProduct(productToDelete.id)
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setShowDeleteConfirm(false)
      setProductToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.price) {
      setError('Please fill in all required fields')
      return
    }

    const isNew = !selectedProduct

    // New products must always be tied to a specific vendor
    if (isNew && !activeVendorId) {
      setError('Please select a shop from the header before creating products.')
      return
    }

    try {
      const priceNumber = Number(formData.price)
      const safePrice = Number.isFinite(priceNumber) ? Math.max(0, priceNumber) : 0

      if (safePrice <= 0) {
        setError('Please enter a valid price greater than 0')
        return
      }

      const taxPercentageRaw = Number(formData.tax_percentage)
      const safeTaxPercentage = Number.isFinite(taxPercentageRaw) ? Math.min(100, Math.max(0, taxPercentageRaw)) : 0

      const discountValueRaw = Number(formData.discount_value)
      const safeDiscountValueNumber = Number.isFinite(discountValueRaw) ? Math.max(0, discountValueRaw) : 0

      const safeDiscountValue =
        formData.discount_type === 'percentage'
          ? Math.min(100, safeDiscountValueNumber)
          : formData.discount_type === 'flat'
            ? Math.min(Math.floor(safePrice), Math.floor(safeDiscountValueNumber))
            : 0

      const productData: any = {
        name: formData.name,
        description: formData.description?.trim() ? formData.description.trim() : null,
        price: safePrice,
        category_id: formData.category_id ? formData.category_id : null,
        imei_or_model: formData.imei_or_model.trim() ? formData.imei_or_model.trim() : null,
        color: formData.color.trim() ? formData.color.trim() : null,
        tax_enabled: !!formData.tax_enabled,
        tax_percentage: safeTaxPercentage,
        discount_enabled: !!formData.discount_enabled,
        discount_type: formData.discount_enabled ? formData.discount_type : 'none',
        discount_value: formData.discount_enabled ? safeDiscountValue : 0,
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
      void loadData(activeVendorId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown'
  }

  const togglePriceSort = () => {
    setPriceSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
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

  if (!activeVendorId && role !== 'grand_user') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">Select a shop</p>
        <p className="text-gray-500 text-sm mt-1">Please select a shop from the sidebar to view products.</p>
      </div>
    )
  }

  const categoriesForModal = (() => {
    const vendorId = activeVendorId || selectedProduct?.vendor_id || null
    if (!vendorId) return categories
    return categories.filter((cat: any) => cat.vendor_id === vendorId)
  })()

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
          </div>

          {/* Search and Filters */}
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 flex items-center gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <Funnel className="h-4 w-4" />
                    <span className="text-xs font-medium">Filters</span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-lg p-3 mr-1 mt-2 z-50 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Category</p>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setCategoryFilter('all')}
                          className={cn(
                            'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                            categoryFilter === 'all'
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          )}
                        >
                          All categories
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryFilter(cat.id)}
                            className={cn(
                              'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                              categoryFilter === cat.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Date range</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'All time' },
                          { id: 'today', label: 'Today' },
                          { id: '7d', label: 'Last 7 days' },
                          { id: '30d', label: 'Last 30 days' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setDateRangeFilter(option.id as 'all' | 'today' | '7d' | '30d')}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors',
                              dateRangeFilter === option.id
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Price</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          placeholder="Min"
                          className="h-8 w-20 text-[11px] border-gray-200"
                        />
                        <span className="text-[10px] text-gray-400">to</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          placeholder="Max"
                          className="h-8 w-20 text-[11px] border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter('all')
                          setDateRangeFilter('all')
                          setMinPrice('')
                          setMaxPrice('')
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {canCreateProducts && (
                <span
                  title={isGrandUserAllShops ? 'Select a shop first' : undefined}
                  className="inline-flex"
                >
                  <Button onClick={handleAddNew} size="sm" disabled={isGrandUserAllShops}>
                    <Plus size={16} />
                    Add Product
                  </Button>
                </span>
              )}
            </div>
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
          <DialogContent
            className="max-w-md max-h-[calc(100dvh-2rem)] p-0 flex flex-col overflow-hidden min-h-0 bg-white"
            showCloseButton={false}
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
              <DialogHeader className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    {selectedProduct ? 'Edit Product' : 'Add New Product'}
                  </DialogTitle>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-white min-h-0">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900" required>Product Name</Label>
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
                <Label htmlFor="price" className="text-sm font-semibold text-gray-900" required>Price</Label>
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
                <Label htmlFor="category" className="text-sm font-semibold text-gray-900">Category</Label>
                <Select.Root value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <Select.Trigger
                    id="category"
                    className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 flex items-center justify-between"
                  >
                    <Select.Value placeholder="Select a category" />
                    <Select.Icon>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      sideOffset={6}
                      className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                      style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                    >
                      <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                        {categoriesForModal.map((cat: any) => (
                          <Select.Item
                            key={cat.id}
                            value={cat.id}
                            className="px-3 py-2 text-sm text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                          >
                            <Select.ItemText>{cat.name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">Defaults</p>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-7">
                    <Label htmlFor="product_imei_or_model" className="text-sm font-medium text-gray-700">IMEI / Model</Label>
                    <Input
                      id="product_imei_or_model"
                      type="text"
                      value={formData.imei_or_model}
                      onChange={(e) => setFormData({ ...formData, imei_or_model: e.target.value })}
                      placeholder="IMEI / Model"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <Label htmlFor="product_color" className="text-sm font-medium text-gray-700">Color</Label>
                    <Input
                      id="product_color"
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Color"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">Tax & Discount Defaults</p>
                <div className="space-y-2">
                  <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.tax_enabled}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true
                            setFormData({
                              ...formData,
                              tax_enabled: enabled,
                              tax_percentage: enabled ? formData.tax_percentage : '0',
                            })
                          }}
                          id="product_tax_enabled"
                        />
                        <Label htmlFor="product_tax_enabled" className="text-sm font-medium text-gray-700">
                          Tax
                        </Label>
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          %
                        </span>
                        <Input
                          id="tax_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.tax_percentage}
                          onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                          disabled={!formData.tax_enabled}
                          className="h-8 w-28 pl-6 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.discount_enabled}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true
                            setFormData({
                              ...formData,
                              discount_enabled: enabled,
                              discount_type: enabled ? (formData.discount_type === 'none' ? 'percentage' : formData.discount_type) : 'none',
                              discount_value: enabled ? formData.discount_value : '0',
                            })
                          }}
                          id="product_discount_enabled"
                        />
                        <Label htmlFor="product_discount_enabled" className="text-sm font-medium text-gray-700">
                          Discount
                        </Label>
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-center w-48">
                        <div className="col-span-7">
                          <Select.Root
                            value={formData.discount_type}
                            onValueChange={(value) =>
                              setFormData({ ...formData, discount_type: value as 'none' | 'percentage' | 'flat' })
                            }
                            disabled={!formData.discount_enabled}
                          >
                            <Select.Trigger className="w-full h-8 px-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 flex items-center justify-between disabled:bg-gray-50 disabled:opacity-50">
                              <Select.Value placeholder="Type" />
                              <Select.Icon>
                                <ChevronDown className="h-3 w-3 text-gray-500" />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content
                                position="popper"
                                sideOffset={6}
                                className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                                style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                              >
                                <Select.Viewport className="py-1">
                                  <Select.Item
                                    value="percentage"
                                    className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                  >
                                    <Select.ItemText>%</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="flat"
                                    className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                  >
                                    <Select.ItemText>Flat</Select.ItemText>
                                  </Select.Item>
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max={formData.discount_type === 'percentage' ? 100 : undefined}
                          step={formData.discount_type === 'flat' ? 1 : 0.01}
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          disabled={!formData.discount_enabled}
                          className="col-span-5 h-8 text-sm w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              <DialogFooter className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 px-4">
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
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedProducts.map((product) => {
              const assignedVendor = getAssignedVendorForProduct(product)
              const initials = assignedVendor ? buildVendorInitials(assignedVendor.name) : ''
              const soldCount = productSoldCounts[product.id] ?? 0

              return (
                <div key={product.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 truncate">{product.description || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span className="truncate max-w-[240px]">{getCategoryName(product.category_id)}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold text-gray-900">৳{product.price.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-semibold">
                        Sold {soldCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {assignedVendor ? (
                        assignedVendor.image_url ? (
                          <img
                            src={assignedVendor.image_url}
                            alt={assignedVendor.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                            {initials}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
                          —
                        </span>
                      )}
                      <span className="truncate text-xs text-gray-700">
                        {assignedVendor ? assignedVendor.name : 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        title="Edit"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestDelete(product)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    <button
                      type="button"
                      onClick={togglePriceSort}
                      className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                    >
                      <span className="uppercase">Price</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedProducts.map((product) => {
                  const assignedVendor = getAssignedVendorForProduct(product)
                  const initials = assignedVendor ? buildVendorInitials(assignedVendor.name) : ''
                  const soldCount = productSoldCounts[product.id] ?? 0

                  return (
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
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <div className="inline-flex items-center gap-2 min-w-0">
                          {assignedVendor ? (
                            assignedVendor.image_url ? (
                              <img
                                src={assignedVendor.image_url}
                                alt={assignedVendor.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                {initials}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
                              —
                            </span>
                          )}
                          <span className="truncate text-xs text-gray-700">
                            {assignedVendor ? assignedVendor.name : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-semibold">
                          {soldCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-900">৳{product.price.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            title="Edit"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestDelete(product)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing {totalProducts === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalProducts)} of {totalProducts}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
              <div className="flex items-center gap-2 justify-between sm:justify-start">
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && productToDelete && (
        <Dialog
          open={showDeleteConfirm}
          onOpenChange={(open) => {
            setShowDeleteConfirm(open)
            if (!open) {
              setProductToDelete(null)
            }
          }}
        >
          <DialogContent className="max-w-sm p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg">Delete Product</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this product{' '}
                <span className="font-semibold">{productToDelete.name}</span>?
              </p>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setProductToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
