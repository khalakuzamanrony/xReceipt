import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { templateService } from '@/services/templateService'

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

  useEffect(() => {
    if (permissions.can_view_templates) {
      loadTemplates()
    }
  }, [permissions.can_view_templates])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await templateService.getAllTemplates()
      setTemplates(data)
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (key: string, checked: boolean) => {
    onChange(key, checked)
    if (key === 'can_view_templates' && !checked) {
      onChange('assigned_template_ids', [])
    }
  }

  const handleTemplateSelect = (templateIds: string[]) => {
    onChange('assigned_template_ids', templateIds)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-gray-900">Receipt Template Access</h4>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_view_templates || false}
            onChange={(e) => handleCheckboxChange('can_view_templates', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">View Receipt Templates</span>
        </label>

        {permissions.can_view_templates && (
          <>
            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={permissions.can_create_templates || false}
                onChange={(e) => handleCheckboxChange('can_create_templates', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700">Create Receipt Template</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={permissions.can_assign_templates || false}
                onChange={(e) => handleCheckboxChange('can_assign_templates', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700">Assign Template</span>
            </label>

            {permissions.can_assign_templates && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Templates
                </label>
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading templates...</div>
                ) : (
                  <select
                    multiple
                    value={permissions.assigned_template_ids || []}
                    onChange={(e) =>
                      handleTemplateSelect(
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    size={Math.min(templates.length, 5)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
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
