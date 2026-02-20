import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

interface ProductAccessGroupProps {
  permissions: {
    can_view_products?: boolean
    can_create_products?: boolean
  }
  onChange: (key: string, value: any) => void
}

export default function ProductAccessGroup({
  permissions,
  onChange,
}: ProductAccessGroupProps) {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    // Auto-enable view if user toggles create while view is off
    if (key !== 'can_view_products' && checked && !permissions.can_view_products) {
      onChange('can_view_products', true)
    }

    onChange(key, checked)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Product Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-3">
        {/* Inline permission toggles */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* View */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_view_products"
              checked={permissions.can_view_products || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_view_products', checked as boolean)}
            />
            <Label htmlFor="can_view_products" className="cursor-pointer font-medium">
              View
            </Label>
          </div>

          {/* Create */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_create_products"
              checked={permissions.can_create_products || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_create_products', checked as boolean)}
            />
            <Label htmlFor="can_create_products" className="cursor-pointer font-medium">
              Create
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
