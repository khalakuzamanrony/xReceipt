import type { AdminPermissions } from '@/types'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

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
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Receipt Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-4">
        {/* View Receipt Checkbox */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="can_view_receipts"
            checked={permissions.can_view_receipts || false}
            onCheckedChange={(checked) => handleCheckboxChange('can_view_receipts', checked as boolean)}
          />
          <Label htmlFor="can_view_receipts" className="cursor-pointer font-medium">
            View Receipt
          </Label>
        </div>

        {/* Conditional: Create Receipt Checkbox */}
        {permissions.can_view_receipts && (
          <div className="ml-6 space-y-4 pt-2 border-l-2 border-blue-200 pl-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="can_create_receipts"
                checked={permissions.can_create_receipts || false}
                onCheckedChange={(checked) => handleCheckboxChange('can_create_receipts', checked as boolean)}
              />
              <Label htmlFor="can_create_receipts" className="cursor-pointer font-medium">
                Create Receipt
              </Label>
            </div>

            {/* Assign Receipt Templates Checkbox */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="can_assign_receipt_templates"
                checked={permissions.can_assign_receipt_templates || false}
                onCheckedChange={(checked) => handleCheckboxChange('can_assign_receipt_templates', checked as boolean)}
              />
              <Label htmlFor="can_assign_receipt_templates" className="cursor-pointer font-medium">
                Assign Receipt Templates
              </Label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
