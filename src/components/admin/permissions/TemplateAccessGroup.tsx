import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { templateService } from '@/services/templateService'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { AlertCircle } from 'lucide-react'

interface TemplateAccessGroupProps {
  permissions: Partial<AdminPermissions>
  onChange: (key: string, value: any) => void
}

export default function TemplateAccessGroup({
  permissions,
  onChange,
}: TemplateAccessGroupProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (permissions.can_view_templates) {
      loadTemplates()
    }
  }, [permissions.can_view_templates])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await templateService.getAllTemplates()
      setTemplates(data)
    } catch (err) {
      setError('Failed to load templates')
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (key: string, checked: boolean) => {
    // Auto-enable view if user toggles create/assign while view is off
    if (key !== 'can_view_templates' && checked && !permissions.can_view_templates) {
      onChange('can_view_templates', true)
    }

    onChange(key, checked)

    if (key === 'can_view_templates' && !checked) {
      onChange('assigned_template_ids', [])
      onChange('can_assign_templates', false)
    }
  }

  const handleTemplateSelect = (templateId: string, checked: boolean) => {
    const current = permissions.assigned_template_ids || []
    const updated = checked
      ? [...current, templateId]
      : current.filter(id => id !== templateId)
    onChange('assigned_template_ids', updated)
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

          {/* Assign specific */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_assign_templates"
              checked={permissions.can_assign_templates || false}
              onCheckedChange={(checked) => handleCheckboxChange('can_assign_templates', checked as boolean)}
            />
            <Label htmlFor="can_assign_templates" className="cursor-pointer font-medium">
              Assign specific
            </Label>
          </div>
        </div>

        {/* Assign Templates List */}
        {permissions.can_view_templates && permissions.can_assign_templates && (
          <div className="mt-2 space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Loading templates...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                <AlertCircle size={16} />
                {error}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-gray-500 text-sm">No templates available</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`template-${template.id}`}
                      checked={(permissions.assigned_template_ids || []).includes(template.id)}
                      onCheckedChange={(checked) => handleTemplateSelect(template.id, checked as boolean)}
                    />
                    <Label htmlFor={`template-${template.id}`} className="cursor-pointer text-sm flex-1">
                      {template.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
