import { useEffect, useState } from 'react'
import type { Category, Vendor } from '@/types'
import { categoryService } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, FolderOpen, Search, Funnel, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import * as ToastPrimitive from '@radix-ui/react-toast'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export default function CategoryList() {
  const { role, permissions } = useAuth()
  const canViewCategories = role === 'grand_user' || !!permissions?.can_view_categories
  const canCreateCategories = role === 'grand_user' || !!permissions?.can_create_categories
  const { memberships, activeVendorId, loading: vendorLoading } = useVendor()
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
  const [toastOpen, setToastOpen] = useState(false)
  const [toastTitle, setToastTitle] = useState('')
  const [toastDescription, setToastDescription] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [assignCategoryId, setAssignCategoryId] = useState<string | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSaving, setAssignSaving] = useState(false)

  const showToast = (title: string, description = '', variant: 'success' | 'error' = 'success') => {
    setToastTitle(title)
    setToastDescription(description)
    setToastVariant(variant)
    setToastOpen(true)
  }

  useEffect(() => {
    if (vendorLoading) return

    if (role === 'admin' && !activeVendorId) {
      setCategories([])
      setLoading(false)
      return
    }

    void loadCategories(activeVendorId)
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await categoryService.deleteCategory(id)
      setCategories(categories.filter(c => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
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
      } else {
        await categoryService.createCategory(categoryData)
      }

      setShowForm(false)
      loadCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save category'
      setError(message)
      showToast('Error', message, 'error')
    }
  }

  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

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

  const handleAssignVendorToCategory = async (category: Category, vendorId: string | null) => {
    try {
      setAssignSaving(true)
      setAssignError(null)

      const updates: Partial<Category> = {
        vendor_id: vendorId,
      }

      await categoryService.updateCategory(category.id, updates)

      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, vendor_id: vendorId } : c)),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update assigned shop'
      setAssignError(message)
    } finally {
      setAssignSaving(false)
    }
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

  const totalCategories = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(totalCategories / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedCategories = filteredCategories.slice(startIndex, startIndex + rowsPerPage)

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

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product categories</p>
          </div>

          {/* Search + Filters */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
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
                  <DropdownMenu.Content className="min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-3 mr-1 mt-2 z-50 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Category type</p>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setTypeFilter('all')}
                          className={cn(
                            'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                            typeFilter === 'all'
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          )}
                        >
                          All categories
                        </button>
                        <button
                          type="button"
                          onClick={() => setTypeFilter('root')}
                          className={cn(
                            'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                            typeFilter === 'root'
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          )}
                        >
                          Root categories only
                        </button>
                        <button
                          type="button"
                          onClick={() => setTypeFilter('child')}
                          className={cn(
                            'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                            typeFilter === 'child'
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          )}
                        >
                          Subcategories only
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setTypeFilter('all')
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {canCreateCategories && (
                <Button onClick={handleAddNew} size="sm">
                  <Plus size={16} />
                  Add Category
                </Button>
              )}
            </div>
          </div>
        </div>
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

      {/* Category Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                  {categories
                    .filter(c => c.id !== selectedCategory?.id)
                    .map((cat) => (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Parent Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subcategories</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedCategories.map((category) => {
                  const children = getChildCategories(category.id)
                  const assignedVendor = getAssignedVendorForCategory(category)
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
                        <DropdownMenu.Root
                          open={assignCategoryId === category.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setAssignCategoryId(category.id)
                              setAssignSearch('')
                              setAssignError(null)
                            } else if (assignCategoryId === category.id && !assignSaving) {
                              setAssignCategoryId(null)
                              setAssignSearch('')
                              setAssignError(null)
                            }
                          }}
                        >
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center -space-x-1 px-0 py-0 cursor-pointer bg-transparent border-0"
                            >
                              {assignedVendor ? (
                                <div className="flex -space-x-1">
                                  {assignedVendor.image_url ? (
                                    <img
                                      src={assignedVendor.image_url}
                                      alt={assignedVendor.name}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                      {buildVendorInitials(assignedVendor.name)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Unassigned</span>
                              )}
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className="min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-2 z-50 space-y-2">
                              {vendors.length === 0 ? (
                                <div className="px-2 py-1 text-xs text-gray-500">No shops available</div>
                              ) : (
                                <>
                                  <div className="px-1">
                                    <Input
                                      type="text"
                                      placeholder="Search shops..."
                                      value={assignSearch}
                                      onChange={(e) => setAssignSearch(e.target.value)}
                                      className="h-8 text-xs border-gray-300"
                                    />
                                  </div>
                                  {assignError && (
                                    <p className="px-1 text-[11px] text-red-600">{assignError}</p>
                                  )}
                                  <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                                    {vendors
                                      .filter((v) =>
                                        v.name.toLowerCase().includes(assignSearch.toLowerCase()),
                                      )
                                      .map((vendor) => {
                                        const isAssigned = category.vendor_id === vendor.id
                                        const vendorInitials = vendor.name
                                          .split(' ')
                                          .map((part) => part.charAt(0).toUpperCase())
                                          .slice(0, 2)
                                          .join('')

                                        return (
                                          <DropdownMenu.Item
                                            key={vendor.id}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                            onSelect={(event) => {
                                              event.preventDefault()
                                              void handleAssignVendorToCategory(category, isAssigned ? null : vendor.id)
                                            }}
                                          >
                                            <span
                                              className={cn(
                                                'inline-flex h-3 w-3 rounded-full border border-gray-300',
                                                isAssigned && 'border-blue-500 bg-blue-500',
                                              )}
                                            />
                                            {vendor.image_url ? (
                                              <img
                                                src={vendor.image_url}
                                                alt={vendor.name}
                                                className="w-6 h-6 rounded-full object-cover"
                                              />
                                            ) : (
                                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                                {vendorInitials}
                                              </span>
                                            )}
                                            <span className="flex-1 truncate">{vendor.name}</span>
                                          </DropdownMenu.Item>
                                        )
                                      })}
                                  </div>
                                </>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
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
                            onClick={() => handleDelete(category.id)}
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
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {totalCategories === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalCategories)} of {totalCategories}
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
      {/* Toast notifications */}
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        <ToastPrimitive.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className={cn(
            'bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 text-sm',
            toastVariant === 'success' && 'border-green-200',
            toastVariant === 'error' && 'border-red-200',
          )}
        >
          <div className="flex-1">
            <ToastPrimitive.Title className="font-semibold text-gray-900">
              {toastTitle}
            </ToastPrimitive.Title>
            {toastDescription && (
              <ToastPrimitive.Description className="text-gray-600 mt-0.5">
                {toastDescription}
              </ToastPrimitive.Description>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastOpen(false)}
            className="text-gray-400 hover:text-gray-600 ml-2"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-72 max-w-full outline-none" />
      </ToastPrimitive.Provider>
    </div>
  )
}
