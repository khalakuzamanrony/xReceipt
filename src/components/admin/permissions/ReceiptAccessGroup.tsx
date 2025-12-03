import type { AdminPermissions } from '@/types'

interface ReceiptAccessGroupProps {
  permissions: Partial<AdminPermissions>
  onChange: (key: string, value: any) => void
}

export default function ReceiptAccessGroup({
  permissions,
  onChange,
}: ReceiptAccessGroupProps) {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    onChange(key, checked)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-gray-900">Receipt Access</h4>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_view_receipts || false}
            onChange={(e) => handleCheckboxChange('can_view_receipts', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">View Receipt</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_create_receipts || false}
            onChange={(e) => handleCheckboxChange('can_create_receipts', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">Create Receipt</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_assign_receipt_templates || false}
            onChange={(e) => handleCheckboxChange('can_assign_receipt_templates', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">Assign Template</span>
        </label>
      </div>
    </div>
  )
}
