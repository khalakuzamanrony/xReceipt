import { useEffect, useState } from 'react'
import type { Category, Vendor } from '@/types'
import { categoryService } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, FolderOpen, Search, Funnel, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

export default function CategoryList() {
  const { role } = useAuth()
  const { memberships, activeVendorId, activeVendor, permissions, loading: vendorLoading } = useVendor()
  const { toast } = useToast()

  const isGrandUserAllShops = role === 'grand_user' && !activeVendorId
  const isPausedVendor = role === 'grand_user' && !!activeVendorId && activeVendor?.status === 'inactive'

  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const canViewCategories = role === 'grand_user' || isVendorSuperAdminForActiveVendor || !!permissions?.can_view_categories
  const canCreateCategories = role === 'grand_user' || isVendorSuperAdminForActiveVendor || !!permissions?.can_create_categories
  const vendors: Vendor[] = memberships.map((m) => m.vendor)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [typeFilter, setTypeFilter] = useState<'all' | 'root' | 'child'>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const showToast = (title: string, description = '', variant: 'success' | 'error' = 'success') => {
    toast(title, description, variant)
  }

  useEffect(() => {
    if (vendorLoading) return

    if (!activeVendorId && !isGrandUserAllShops) {
      setCategories([])
      setLoading(false)
      return
    }

    void loadCategories(activeVendorId ?? null)
  }, [vendorLoading, activeVendorId, role])

  const loadCategories = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const vendorFilter = vendorId ?? undefined
      const data = await categoryService.getAllCategories(vendorFilter)
      setCategories(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories'
      setError(errorMessage)
      showToast('Error', errorMessage, 'error')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    // Require a vendor selection before creating categories
    if (!activeVendorId) {
      const message = 'Please select a shop from the header before creating categories.'
      setError(message)
      showToast('Error', message, 'error')
      return
    }

    if (isPausedVendor) {
      const message = 'Shop is not found. Please contact to the author.'
      setError(message)
      showToast('Error', message, 'error')
      return
    }

    setSelectedCategory(null)
    setFormData({ name: '', parent_id: '' })
    setShowForm(true)
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      parent_id: category.parent_id || '',
    })
    setShowForm(true)
  }

  const handleRequestDelete = (category: Category) => {
    setCategoryToDelete(category)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      setIsDeleting(true)
      await categoryService.deleteCategory(categoryToDelete.id)
      setCategories(categories.filter(c => c.id !== categoryToDelete.id))
      setShowDeleteConfirm(false)
      setCategoryToDelete(null)
      showToast('Category deleted', 'The category has been deleted.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category'
      setError(message)
      showToast('Failed to delete category', message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      const message = 'Category name is required'
      setError(message)
      showToast('Error', message, 'error')
      return
    }

    const isNew = !selectedCategory

    // New categories must always be tied to a specific vendor
    if (isNew && !activeVendorId) {
      const message = 'Please select a shop from the header before creating categories.'
      setError(message)
      showToast('Error', message, 'error')
      return
    }

    try {
      const categoryData: any = {
        name: formData.name,
        parent_id: formData.parent_id || null,
      }

      if (isNew && activeVendorId) {
        categoryData.vendor_id = activeVendorId
      }

      if (selectedCategory) {
        await categoryService.updateCategory(selectedCategory.id, categoryData)
        showToast('Category updated', 'The category has been updated.', 'success')
      } else {
        await categoryService.createCategory(categoryData)
        showToast('Category created', 'The category has been created.', 'success')
      }

      setShowForm(false)
      void loadCategories(activeVendorId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save category'
      setError(message)
      showToast('Error', message, 'error')
    }
  }

  const assignedCategoryIds = permissions?.assigned_category_ids || []
  const permissionFilteredCategories =
    role === 'admin' &&
    !isVendorSuperAdminForActiveVendor &&
    permissions?.can_view_categories &&
    permissions?.can_assign_categories &&
    assignedCategoryIds.length > 0
      ? categories.filter((category) => assignedCategoryIds.includes(category.id))
      : categories

  const searchFilteredCategories = permissionFilteredCategories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  let filteredCategories = searchFilteredCategories

  if (typeFilter === 'root') {
    filteredCategories = filteredCategories.filter((category) => !category.parent_id)
  } else if (typeFilter === 'child') {
    filteredCategories = filteredCategories.filter((category) => !!category.parent_id)
  }

  const getChildCategories = (parentId: string) => {
    return filteredCategories.filter(c => c.parent_id === parentId)
  }

  const getAssignedVendorForCategory = (category: Category): Vendor | null => {
    if (!category.vendor_id) return null
    return vendors.find((v) => v.id === category.vendor_id) || null
  }

  const buildVendorInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')

  const getParentCategoryName = (parentId: string) => {
    return categories.find(c => c.id === parentId)?.name || 'Unknown'
  }

  const categoriesForModal = (() => {
    const vendorId = activeVendorId || selectedCategory?.vendor_id || null
    if (!vendorId) return categories
    return categories.filter((cat) => cat.vendor_id === vendorId)
  })()

  const sortedCategories = filteredCategories.slice().sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    const delta = bTime - aTime
    if (delta !== 0) return delta
    return (a.name || '').localeCompare(b.name || '')
  })

  const totalCategories = sortedCategories.length
  const totalPages = Math.max(1, Math.ceil(totalCategories / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedCategories = sortedCategories.slice(startIndex, startIndex + rowsPerPage)

  if (loading || vendorLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading categories...</p>
      </div>
    )
  }

  if (!canViewCategories) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FolderOpen size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Categories</p>
        <p className="text-gray-500 text-sm mt-1">Contact a Grand User if you think this is a mistake.</p>
      </div>
    )
  }

  const getActiveFiltersCount = () => {
    return typeFilter !== 'all' ? 1 : 0
  }

  const clearAllFilters = () => {
    setTypeFilter('all')
    setSearchTerm('')
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product categories</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full sm:w-64 border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-10 px-4 rounded-lg border-gray-200 flex items-center gap-2 transition-all',
                    getActiveFiltersCount() > 0
                      ? 'bg-violet-50 border-violet-200 text-violet-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Funnel className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-semibold rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[280px] rounded-xl border border-gray-200 bg-white shadow-xl p-4 mr-2 mt-2 z-50 space-y-4">
                  {/* Type Filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Type</p>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setTypeFilter('all')}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          typeFilter === 'all'
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        All categories
                      </button>
                      <button
                        type="button"
                        onClick={() => setTypeFilter('root')}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          typeFilter === 'root'
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        Root categories only
                      </button>
                      <button
                        type="button"
                        onClick={() => setTypeFilter('child')}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          typeFilter === 'child'
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        Subcategories only
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {getActiveFiltersCount()} active {getActiveFiltersCount() === 1 ? 'filter' : 'filters'}
                    </span>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Add Button */}
            {canCreateCategories && (
              <span
                title={isGrandUserAllShops ? 'Select a shop first' : isPausedVendor ? 'Shop is inactive' : undefined}
                className="inline-flex"
              >
                <Button
                  onClick={handleAddNew}
                  size="sm"
                  disabled={isGrandUserAllShops || isPausedVendor}
                  className="h-10 rounded-lg"
                >
                  <Plus size={16} className="mr-1" />
                  Add Category
                </Button>
              </span>
            )}
          </div>
        </div>

        {/* Active Filter Pills */}
        {(typeFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 mr-1">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-gray-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Type: {typeFilter === 'root' ? 'Root only' : 'Subcategories only'}
                <button onClick={() => setTypeFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <FolderOpen size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && categoryToDelete && (
        <Dialog open={true} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md bg-white" showCloseButton={false}>
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">Delete Category</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong className="text-gray-900">{categoryToDelete.name}</strong>?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This action cannot be undone. The category will be permanently deleted.
              </p>
            </div>
            <DialogFooter className="border-t border-gray-200 pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCategoryToDelete(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Category Form Modal */}
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
                    {selectedCategory ? 'Edit Category' : 'Add New Category'}
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
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900" required>Category Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent" className="text-sm font-semibold text-gray-900">Parent Category (Optional)</Label>
                <select
                  id="parent"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                >
                  <option value="">No parent (Root category)</option>
                  {categoriesForModal
                    .filter(c => c.id !== selectedCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              </div>

              <DialogFooter className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 px-4">
                  {selectedCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Categories Table */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <FolderOpen size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No categories found' : 'No categories yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first category to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedCategories.map((category) => {
              const children = getChildCategories(category.id)
              const assignedVendor = getAssignedVendorForCategory(category)
              const initials = assignedVendor ? buildVendorInitials(assignedVendor.name) : ''

              return (
                <div key={category.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{category.name}</p>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Parent</span>
                          <span className="truncate max-w-[70%]">
                            {category.parent_id ? getParentCategoryName(category.parent_id) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Subcategories</span>
                          <span className="font-medium text-gray-800">
                            {children.length > 0 ? `${children.length} item${children.length !== 1 ? 's' : ''}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        title="Edit"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestDelete(category)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between gap-3"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Parent Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subcategories</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Shop</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedCategories.map((category) => {
                  const children = getChildCategories(category.id)
                  const assignedVendor = getAssignedVendorForCategory(category)
                  const initials = assignedVendor ? buildVendorInitials(assignedVendor.name) : ''
                  return (
                    <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {category.name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {category.parent_id ? getParentCategoryName(category.parent_id) : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {children.length > 0 ? `${children.length} item${children.length !== 1 ? 's' : ''}` : '—'}
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
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            title="Edit"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestDelete(category)}
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
              Showing {totalCategories === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalCategories)} of {totalCategories}
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
    </div>
  )
}
