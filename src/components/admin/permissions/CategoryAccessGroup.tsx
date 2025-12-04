import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { categoryService } from '@/services/categoryService'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { AlertCircle } from 'lucide-react'

interface CategoryAccessGroupProps {
  permissions: Partial<AdminPermissions>
  onChange: (key: string, value: any) => void
}

export default function CategoryAccessGroup({
  permissions,
  onChange,
}: CategoryAccessGroupProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (permissions.can_view_categories) {
      loadCategories()
    }
  }, [permissions.can_view_categories])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoryService.getAllCategories()
      setCategories(data)
    } catch (err) {
      setError('Failed to load categories')
      console.error('Failed to load categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (key: string, checked: boolean) => {
    onChange(key, checked)
    if (key === 'can_view_categories' && !checked) {
      onChange('assigned_category_ids', [])
    }
  }

  const handleCategorySelect = (categoryId: string, checked: boolean) => {
    const current = permissions.assigned_category_ids || []
    const updated = checked
      ? [...current, categoryId]
      : current.filter(id => id !== categoryId)
    onChange('assigned_category_ids', updated)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Category Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-4">
        {/* View Categories Checkbox */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="can_view_categories"
            checked={permissions.can_view_categories || false}
            onCheckedChange={(checked) => handleCheckboxChange('can_view_categories', checked as boolean)}
          />
          <Label htmlFor="can_view_categories" className="cursor-pointer font-medium">
            View Category
          </Label>
        </div>

        {/* Conditional: Create & Assign Category Checkboxes */}
        {permissions.can_view_categories && (
          <div className="ml-6 space-y-4 pt-2 border-l-2 border-blue-200 pl-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="can_create_categories"
                checked={permissions.can_create_categories || false}
                onCheckedChange={(checked) => handleCheckboxChange('can_create_categories', checked as boolean)}
              />
              <Label htmlFor="can_create_categories" className="cursor-pointer font-medium">
                Create Category
              </Label>
            </div>

            {/* Assign Categories Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="can_assign_categories"
                  checked={permissions.can_assign_categories || false}
                  onCheckedChange={(checked) => handleCheckboxChange('can_assign_categories', checked as boolean)}
                />
                <Label htmlFor="can_assign_categories" className="cursor-pointer font-medium">
                  Assign Specific Categories
                </Label>
              </div>

              {permissions.can_assign_categories && (
                <div className="ml-6 space-y-2">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      Loading categories...
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-gray-500 text-sm">No categories available</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={(permissions.assigned_category_ids || []).includes(category.id)}
                            onCheckedChange={(checked) => handleCategorySelect(category.id, checked as boolean)}
                          />
                          <Label htmlFor={`category-${category.id}`} className="cursor-pointer text-sm flex-1">
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
