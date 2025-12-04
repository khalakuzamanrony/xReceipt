import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { templateService } from '@/services/templateService'

interface PocketFilmsTemplateProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

export default function PocketFilmsTemplate({ open, onClose, onSave }: PocketFilmsTemplateProps) {
  const [companyName, setCompanyName] = useState('Pocket Films')
  const [logoUrl, setLogoUrl] = useState('https://via.placeholder.com/120x80?text=POCKET+FILMS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateTemplate = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 30px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo {
      width: 120px;
      height: 80px;
      background-color: #f0f0f0;
      border: 2px solid #333;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }
    
    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
    
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .date-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .date-item {
      font-size: 13px;
    }
    
    .date-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    
    .date-value {
      color: #666;
      font-size: 12px;
    }
    
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    
    .party {
      font-size: 13px;
    }
    
    .party-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    
    .party-details {
      color: #666;
      line-height: 1.6;
    }
    
    .table-container {
      margin-bottom: 30px;
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead {
      background-color: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #333;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #f0f0f0;
      color: #666;
    }
    
    tr.group-header td {
      background-color: #fafafa;
      font-weight: 600;
      color: #333;
      padding-top: 16px;
      padding-bottom: 8px;
    }
    
    tr.bundle-header td {
      background-color: #fafafa;
      font-weight: 600;
      color: #333;
      padding-top: 12px;
      padding-bottom: 8px;
      padding-left: 20px;
    }
    
    tr.item-row td {
      padding-left: 20px;
    }
    
    .qty-col {
      text-align: center;
    }
    
    .price-col {
      text-align: right;
    }
    
    .search-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .totals-section {
      width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
      color: #666;
    }
    
    .total-row.final {
      border-top: 2px solid #333;
      padding-top: 12px;
      padding-bottom: 0;
      font-weight: 700;
      font-size: 14px;
      color: #333;
    }
    
    .notes {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #e0e0e0;
    }
    
    .notes-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .notes-content {
      color: #666;
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        <div class="logo">
          <img src="${logoUrl}" alt="${companyName}">
        </div>
        <div class="company-name">${companyName}</div>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">Invoice #{{RECEIPT_ID}}</div>
        <div class="invoice-number">
          <div class="date-item">
            <div class="date-label">Issue Date</div>
            <div class="date-value">{{DATE}}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dates Section -->
    <div class="dates-grid">
      <div class="date-section">
        <div class="date-item">
          <div class="date-label">Issue Date</div>
          <div class="date-value">{{DATE}}</div>
        </div>
        <div class="date-item">
          <div class="date-label">Due Date</div>
          <div class="date-value">{{DATE}}</div>
        </div>
      </div>
    </div>
    
    <!-- From/To Section -->
    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-details">
          <strong>${companyName}</strong><br>
          123 Business Street<br>
          City, State 12345<br>
          contact@company.com
        </div>
      </div>
      <div class="party">
        <div class="party-label">To</div>
        <div class="party-details">
          <strong>{{CUSTOMER_NAME}}</strong><br>
          {{CUSTOMER_EMAIL}}
        </div>
      </div>
    </div>
    
    <!-- Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Item</th>
            <th style="width: 20%;" class="qty-col">Qty</th>
            <th style="width: 20%;" class="price-col">Unit Price</th>
            <th style="width: 20%;" class="price-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {{ITEMS}}
          <tr>
            <td colspan="4" style="height: 20px;"></td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    <div class="totals">
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>{{SUBTOTAL}}</span>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <span>{{TOTAL}}</span>
        </div>
      </div>
    </div>
    
    <!-- Notes -->
    <div class="notes">
      <div class="notes-label">Notes</div>
      <div class="notes-content">
        Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts.
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const templateHtml = generateTemplate()

      await templateService.createTemplate({
        name: `${companyName} Invoice Template`,
        description: `Professional invoice template for ${companyName}`,
        template_html: templateHtml,
      })

      onClose()
      if (onSave) onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Pocket Films Invoice Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="border rounded-lg bg-gray-50 p-4 max-h-96 overflow-y-auto">
            <div
              dangerouslySetInnerHTML={{ __html: generateTemplate() }}
              className="bg-white"
            />
          </div>

          {/* Configuration */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="Enter logo image URL"
              />
              {logoUrl && (
                <div className="mt-2 p-2 bg-gray-100 rounded flex items-center gap-2">
                  <img src={logoUrl} alt="Logo preview" className="h-12 w-12 object-contain" />
                  <span className="text-sm text-gray-600">Logo preview</span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
