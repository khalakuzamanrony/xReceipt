import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { categoryService } from '@/services/categoryService'

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

  useEffect(() => {
    if (permissions.can_view_categories) {
      loadCategories()
    }
  }, [permissions.can_view_categories])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await categoryService.getAllCategories()
      setCategories(data)
    } catch (err) {
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

  const handleCategorySelect = (categoryIds: string[]) => {
    onChange('assigned_category_ids', categoryIds)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-gray-900">Category Access</h4>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_view_categories || false}
            onChange={(e) => handleCheckboxChange('can_view_categories', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">View Category</span>
        </label>

        {permissions.can_view_categories && (
          <>
            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={permissions.can_create_categories || false}
                onChange={(e) => handleCheckboxChange('can_create_categories', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700">Create Category</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={permissions.can_assign_categories || false}
                onChange={(e) => handleCheckboxChange('can_assign_categories', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700">Assign Category</span>
            </label>

            {permissions.can_assign_categories && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Categories
                </label>
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading categories...</div>
                ) : (
                  <select
                    multiple
                    value={permissions.assigned_category_ids || []}
                    onChange={(e) =>
                      handleCategorySelect(
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    size={Math.min(categories.length, 5)}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
