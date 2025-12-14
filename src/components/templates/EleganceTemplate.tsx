import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { templateService } from '@/services/templateService'
import { useVendor } from '@/contexts/VendorContext'

interface EleganceTemplateProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

export default function EleganceTemplate({ open, onClose, onSave }: EleganceTemplateProps) {
  const { activeVendorId } = useVendor()
  const [companyName, setCompanyName] = useState('Maison Élégance')
  const [companySubtitle, setCompanySubtitle] = useState('ATELIER')
  const [companyAddress, setCompanyAddress] = useState('45 East 78th Street')
  const [companyCity, setCompanyCity] = useState('New York, NY 10075')
  const [companyEmail, setCompanyEmail] = useState('contact@maisonelegance.com')
  const [companyPhone, setCompanyPhone] = useState('+1 (212) 555-0123')
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      background-color: #f8f8f8;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    
    .header {
      padding: 40px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    
    .company-subtitle {
      font-size: 11px;
      letter-spacing: 1.5px;
      color: #999;
      text-transform: uppercase;
      font-weight: 500;
    }
    
    .invoice-header {
      text-align: right;
    }
    
    .invoice-number {
      font-size: 32px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .invoice-status {
      display: inline-block;
      background-color: #e8f5e9;
      color: #2e7d32;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .company-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 30px;
    }
    
    .detail-block {
      font-size: 13px;
      line-height: 1.6;
      color: #666;
    }
    
    .detail-block-title {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #999;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .detail-block-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding-top: 30px;
      border-top: 1px solid #f0f0f0;
    }
    
    .date-item {
      font-size: 13px;
    }
    
    .date-label {
      color: #999;
      font-size: 11px;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    
    .date-value {
      color: #1a1a1a;
      font-weight: 500;
    }
    
    .content {
      padding: 40px;
    }
    
    .table-container {
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead {
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    th {
      padding: 16px 0;
      text-align: left;
      font-weight: 600;
      color: #999;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    th:last-child {
      text-align: right;
    }
    
    td {
      padding: 20px 0;
      border-bottom: 1px solid #f5f5f5;
      color: #1a1a1a;
    }
    
    td:last-child {
      text-align: right;
    }
    
    .item-description {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .item-details {
      font-size: 12px;
      color: #999;
      line-height: 1.5;
    }
    
    .quantity-col {
      text-align: center;
      color: #1a1a1a;
      font-weight: 500;
    }
    
    .rate-col {
      text-align: right;
      color: #1a1a1a;
      font-weight: 500;
    }
    
    .amount-col {
      text-align: right;
      color: #1a1a1a;
      font-weight: 600;
    }
    
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #e0e0e0;
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
    
    .total-row.subtotal {
      margin-bottom: 8px;
    }
    
    .total-row.final {
      border-top: 2px solid #1a1a1a;
      padding-top: 12px;
      font-weight: 600;
      color: #1a1a1a;
      font-size: 14px;
    }
    
    .total-label {
      font-weight: 500;
    }
    
    .total-value {
      text-align: right;
    }
    
    .footer {
      padding: 30px 40px;
      background-color: #fafafa;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #999;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          <div class="company-subtitle">${companySubtitle}</div>
        </div>
        <div class="invoice-header">
          <div class="invoice-number">Invoice #{{RECEIPT_ID}}</div>
          <div class="invoice-status">Paid</div>
        </div>
      </div>
      
      <div class="company-details">
        <div class="detail-block">
          <div class="detail-block-name">${companyName}</div>
          <div>${companyAddress}</div>
          <div>${companyCity}</div>
          <div>${companyEmail}</div>
          <div>${companyPhone}</div>
        </div>
        <div class="detail-block">
          <div class="detail-block-title">Bill To</div>
          <div class="detail-block-name">{{CUSTOMER_NAME}}</div>
          <div>{{CUSTOMER_EMAIL}}</div>
        </div>
      </div>
      
      <div class="dates">
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
    
    <!-- Content -->
    <div class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 45%;">Description</th>
              <th style="width: 15%;" class="quantity-col">Quantity</th>
              <th style="width: 15%;" class="rate-col">Rate</th>
              <th style="width: 25%;" class="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {{ITEMS}}
          </tbody>
        </table>
      </div>
      
      <!-- Totals -->
      <div class="totals">
        <div class="totals-section">
          <div class="total-row subtotal">
            <span class="total-label">Subtotal</span>
            <span class="total-value">{{SUBTOTAL}}</span>
          </div>
          <div class="total-row final">
            <span class="total-label">Total</span>
            <span class="total-value">{{TOTAL}}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <strong>Notes:</strong><br>
      Thank you for your business. Please contact us if you have any questions about this invoice.
    </div>
  </div>
</body>
</html>
    `
  }

  const handleSave = async () => {
    if (!activeVendorId) {
      setError('Please select a vendor from the header before creating templates.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const templateHtml = generateTemplate()

      await templateService.createTemplate({
        name: `${companyName} Elegance Template`,
        description: `Clean and elegant invoice template for ${companyName}`,
        template_html: templateHtml,
        vendor_id: activeVendorId,
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
      <DialogContent className="max-w-7xl bg-white h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="border-b border-gray-200 px-8 py-6">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-2xl font-bold text-gray-900">Create Elegance Invoice Template</DialogTitle>
            <p className="text-sm text-gray-500">Customize your invoice template with company information</p>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Inputs (35%) */}
          <div className="w-[35%] border-r border-gray-200 overflow-y-auto bg-white">
            <div className="px-8 py-6 space-y-6">
              {/* Section Header */}
              <div className="pb-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Company Information</h3>
                <p className="text-xs text-gray-500 mt-1">Enter your company details</p>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-sm font-semibold text-gray-900">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g., Maison Élégance"
                    className="w-full"
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-2">
                  <Label htmlFor="company-subtitle" className="text-sm font-semibold text-gray-900">
                    Subtitle
                  </Label>
                  <Input
                    id="company-subtitle"
                    value={companySubtitle}
                    onChange={e => setCompanySubtitle(e.target.value)}
                    placeholder="e.g., ATELIER"
                    className="w-full"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="company-address" className="text-sm font-semibold text-gray-900">
                    Street Address
                  </Label>
                  <Input
                    id="company-address"
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    placeholder="e.g., 45 East 78th Street"
                    className="w-full"
                  />
                </div>

                {/* City, State, ZIP */}
                <div className="space-y-2">
                  <Label htmlFor="company-city" className="text-sm font-semibold text-gray-900">
                    City, State, ZIP
                  </Label>
                  <Input
                    id="company-city"
                    value={companyCity}
                    onChange={e => setCompanyCity(e.target.value)}
                    placeholder="e.g., New York, NY 10075"
                    className="w-full"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="company-email" className="text-sm font-semibold text-gray-900">
                    Email Address
                  </Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyEmail}
                    onChange={e => setCompanyEmail(e.target.value)}
                    placeholder="e.g., contact@company.com"
                    className="w-full"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="company-phone" className="text-sm font-semibold text-gray-900">
                    Phone Number
                  </Label>
                  <Input
                    id="company-phone"
                    type="tel"
                    value={companyPhone}
                    onChange={e => setCompanyPhone(e.target.value)}
                    placeholder="e.g., +1 (212) 555-0123"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview (65%) */}
          <div className="w-[65%] bg-gray-50 overflow-y-auto">
            <div className="px-8 py-6 h-full">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="p-4 overflow-y-auto h-full">
                  {/* Use iframe so template CSS is sandboxed and cannot override app layout */}
                  <iframe
                    title="Elegance template preview"
                    srcDoc={generateTemplate()}
                    className="w-full h-[640px] border-0 rounded-md bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-8 py-4 flex gap-3 justify-end bg-gray-50">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium"
          >
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
