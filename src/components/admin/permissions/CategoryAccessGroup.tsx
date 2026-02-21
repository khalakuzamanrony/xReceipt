import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

interface CategoryAccessGroupProps {
  permissions: {
    can_view_categories?: boolean
    can_create_categories?: boolean
  }
  onChange: (key: string, value: any) => void
}

export default function CategoryAccessGroup({
  permissions,
  onChange,
}: CategoryAccessGroupProps) {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    // Auto-enable view if user toggles create while view is off
    if (key !== 'can_view_categories' && checked && !permissions.can_view_categories) {
      onChange('can_view_categories', true)
    }

    onChange(key, checked)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Category Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-3">
        {/* Inline permission toggles */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* View */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_view_categories"
              checked={permissions.can_view_categories || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_view_categories', checked as boolean)}
            />
            <Label htmlFor="can_view_categories" className="cursor-pointer font-medium">
              View
            </Label>
          </div>

          {/* Create */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_create_categories"
              checked={permissions.can_create_categories || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_create_categories', checked as boolean)}
            />
            <Label htmlFor="can_create_categories" className="cursor-pointer font-medium">
              Create
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
