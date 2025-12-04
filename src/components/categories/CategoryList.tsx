import { useEffect, useState } from 'react'
import type { Category } from '@/types'
import { categoryService } from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, AlertCircle, FolderOpen } from 'lucide-react'

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoryService.getAllCategories()
      setCategories(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories'
      setError(errorMessage)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
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
      setError('Category name is required')
      return
    }

    try {
      const categoryData = {
        name: formData.name,
        parent_id: formData.parent_id || null,
      }

      if (selectedCategory) {
        await categoryService.updateCategory(selectedCategory.id, categoryData)
      } else {
        await categoryService.createCategory(categoryData)
      }

      setShowForm(false)
      loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    }
  }

  const getRootCategories = () => {
    return categories.filter(c => !c.parent_id)
  }

  const getChildCategories = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading categories...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FolderOpen size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Organize your products with categories</p>
          </div>
        </div>
        <Button onClick={handleAddNew} size="lg">
          <Plus size={20} />
          Add Category
        </Button>
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

      {/* Category Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
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
                <Label htmlFor="parent">Parent Category (Optional)</Label>
                <select
                  id="parent"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <DialogFooter className="gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedCategory ? 'Update' : 'Create'} Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FolderOpen size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">No categories yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first category to get started.</p>
            <Button onClick={handleAddNew} className="mt-6">
              <Plus size={18} />
              Create First Category
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {getRootCategories().map((category) => {
            const children = getChildCategories(category.id)
            return (
              <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    {children.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {children.length} subcategory{children.length !== 1 ? 'ies' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                      title="Edit category"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                      title="Delete category"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Child Categories */}
                {children.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-200 divide-y divide-gray-200">
                    {children.map((child) => (
                      <div key={child.id} className="p-4 pl-8 flex justify-between items-center hover:bg-gray-100 transition">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            └ {child.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(child)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Edit category"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(child.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                            title="Delete category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
