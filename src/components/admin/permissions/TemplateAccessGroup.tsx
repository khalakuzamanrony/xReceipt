import type { AdminPermissions } from '@/types'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

interface TemplateAccessGroupProps {
  permissions: Partial<AdminPermissions>
  onChange: (key: string, value: any) => void
}

export default function TemplateAccessGroup({
  permissions,
  onChange,
}: TemplateAccessGroupProps) {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    // Auto-enable view if user toggles create/assign while view is off
    if (key !== 'can_view_templates' && checked && !permissions.can_view_templates) {
      onChange('can_view_templates', true)
    }

    onChange(key, checked)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Receipt Template Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-3">
        {/* Inline permission toggles */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* View */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_view_templates"
              checked={permissions.can_view_templates || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_view_templates', checked as boolean)}
            />
            <Label htmlFor="can_view_templates" className="cursor-pointer font-medium">
              View
            </Label>
          </div>

          {/* Create */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_create_templates"
              checked={permissions.can_create_templates || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_create_templates', checked as boolean)}
            />
            <Label htmlFor="can_create_templates" className="cursor-pointer font-medium">
              Create
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
