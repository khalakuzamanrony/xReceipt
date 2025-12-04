import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { templateService } from '@/services/templateService'

interface EleganceTemplateProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

export default function EleganceTemplate({ open, onClose, onSave }: EleganceTemplateProps) {
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
    try {
      setLoading(true)
      setError(null)

      const templateHtml = generateTemplate()

      await templateService.createTemplate({
        name: `${companyName} Elegance Template`,
        description: `Clean and elegant invoice template for ${companyName}`,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Elegance Invoice Template</DialogTitle>
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
            <h3 className="font-semibold text-sm">Company Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="company-subtitle">Subtitle (e.g., ATELIER)</Label>
                <Input
                  id="company-subtitle"
                  value={companySubtitle}
                  onChange={e => setCompanySubtitle(e.target.value)}
                  placeholder="Enter subtitle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Input
                id="company-address"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-city">City, State, ZIP</Label>
                <Input
                  id="company-city"
                  value={companyCity}
                  onChange={e => setCompanyCity(e.target.value)}
                  placeholder="Enter city, state, ZIP"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  value={companyEmail}
                  onChange={e => setCompanyEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={e => setCompanyPhone(e.target.value)}
                placeholder="Enter phone number"
              />
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
