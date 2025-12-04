import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Copy, Eye, Plus } from 'lucide-react'
import { templateService } from '@/services/templateService'

interface TemplatePreset {
  id: string
  name: string
  description: string
  html: string
  preview: string
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'minimal',
    name: 'Minimal Receipt',
    description: 'Clean and simple receipt template',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #666; font-size: 12px; }
    .receipt-number { text-align: right; color: #999; font-size: 11px; margin-bottom: 20px; }
    .items { margin: 20px 0; }
    .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .item-name { flex: 1; }
    .item-price { text-align: right; min-width: 80px; }
    .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECEIPT</h1>
    <p>Thank you for your purchase</p>
  </div>
  
  <div class="receipt-number">Receipt #{{RECEIPT_ID}}</div>
  
  <div class="items">
    <div class="item">
      <span class="item-name">Item</span>
      <span class="item-price">Price</span>
    </div>
    {{ITEMS}}
  </div>
  
  <div class="total">
    <span>Total:</span>
    <span>{{TOTAL}}</span>
  </div>
  
  <div class="footer">
    <p>Date: {{DATE}}</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>`,
    preview: 'Simple receipt with item list and total'
  },
  {
    id: 'professional',
    name: 'Professional Receipt',
    description: 'Professional business receipt template',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 500px; margin: 20px auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
    .company-info h1 { color: #2c3e50; font-size: 28px; margin-bottom: 5px; }
    .company-info p { color: #7f8c8d; font-size: 12px; }
    .receipt-meta { text-align: right; }
    .receipt-meta .label { color: #95a5a6; font-size: 11px; text-transform: uppercase; }
    .receipt-meta .value { color: #2c3e50; font-weight: bold; font-size: 14px; }
    .customer-info { margin-bottom: 30px; }
    .customer-info h3 { color: #2c3e50; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .customer-info p { color: #7f8c8d; font-size: 13px; margin: 3px 0; }
    .items-table { width: 100%; margin-bottom: 30px; }
    .items-table thead { background: #ecf0f1; }
    .items-table th { padding: 12px; text-align: left; color: #2c3e50; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #bdc3c7; }
    .items-table td { padding: 12px; border-bottom: 1px solid #ecf0f1; color: #34495e; font-size: 13px; }
    .items-table .qty { text-align: center; }
    .items-table .price { text-align: right; }
    .summary { margin-bottom: 30px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; color: #7f8c8d; font-size: 13px; }
    .summary-row.total { border-top: 2px solid #2c3e50; padding-top: 12px; margin-top: 12px; color: #2c3e50; font-weight: bold; font-size: 16px; }
    .payment-method { background: #ecf0f1; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
    .payment-method p { color: #2c3e50; font-size: 12px; margin: 3px 0; }
    .footer { text-align: center; color: #95a5a6; font-size: 11px; padding-top: 20px; border-top: 1px solid #ecf0f1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>INVOICE</h1>
        <p>Your Company Name</p>
      </div>
      <div class="receipt-meta">
        <div class="label">Invoice #</div>
        <div class="value">{{RECEIPT_ID}}</div>
        <div class="label" style="margin-top: 10px;">Date</div>
        <div class="value">{{DATE}}</div>
      </div>
    </div>

    <div class="customer-info">
      <h3>Bill To</h3>
      <p><strong>{{CUSTOMER_NAME}}</strong></p>
      <p>{{CUSTOMER_EMAIL}}</p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Qty</th>
          <th class="price">Unit Price</th>
          <th class="price">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{ITEMS}}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>{{SUBTOTAL}}</span>
      </div>
      <div class="summary-row">
        <span>Tax (0%):</span>
        <span>{{TAX}}</span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span>{{TOTAL}}</span>
      </div>
    </div>

    <div class="payment-method">
      <p><strong>Payment Status:</strong> {{STATUS}}</p>
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For questions, contact us at {{COMPANY_EMAIL}}</p>
    </div>
  </div>
</body>
</html>`,
    preview: 'Professional invoice with detailed formatting'
  },
  {
    id: 'modern',
    name: 'Modern Receipt',
    description: 'Modern colorful receipt template',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .receipt { max-width: 450px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .receipt-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .receipt-header h1 { font-size: 32px; margin-bottom: 5px; }
    .receipt-header p { opacity: 0.9; font-size: 14px; }
    .receipt-body { padding: 30px; }
    .receipt-meta { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0; }
    .meta-item { }
    .meta-label { color: #999; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .meta-value { color: #333; font-weight: 600; font-size: 14px; }
    .customer-section { margin-bottom: 25px; }
    .section-title { color: #667eea; font-size: 12px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
    .customer-name { color: #333; font-weight: 600; font-size: 15px; }
    .customer-email { color: #999; font-size: 13px; }
    .items-list { margin-bottom: 25px; }
    .item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .item-details { flex: 1; }
    .item-name { color: #333; font-weight: 500; font-size: 14px; }
    .item-qty { color: #999; font-size: 12px; margin-top: 2px; }
    .item-price { color: #667eea; font-weight: 600; font-size: 14px; text-align: right; }
    .totals { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #666; font-size: 13px; }
    .total-row.final { border-top: 2px solid #e0e0e0; padding-top: 10px; margin-top: 10px; color: #333; font-weight: 700; font-size: 16px; }
    .footer-message { text-align: center; color: #999; font-size: 12px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>✓ RECEIPT</h1>
      <p>Transaction Complete</p>
    </div>

    <div class="receipt-body">
      <div class="receipt-meta">
        <div class="meta-item">
          <div class="meta-label">Receipt ID</div>
          <div class="meta-value">{{RECEIPT_ID}}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">{{DATE}}</div>
        </div>
      </div>

      <div class="customer-section">
        <div class="section-title">Customer</div>
        <div class="customer-name">{{CUSTOMER_NAME}}</div>
        <div class="customer-email">{{CUSTOMER_EMAIL}}</div>
      </div>

      <div class="items-list">
        <div class="section-title">Items</div>
        {{ITEMS}}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>{{SUBTOTAL}}</span>
        </div>
        <div class="total-row">
          <span>Tax</span>
          <span>{{TAX}}</span>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <span>{{TOTAL}}</span>
        </div>
      </div>

      <div class="footer-message">
        <p>Thank you for your purchase!</p>
        <p style="margin-top: 8px; font-size: 11px;">Keep this receipt for your records</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    preview: 'Modern colorful receipt with gradient design'
  },
  {
    id: 'compact',
    name: 'Compact Receipt',
    description: 'Compact receipt for thermal printers',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 5mm; background: white; }
    .header { text-align: center; margin-bottom: 5mm; }
    .header h1 { font-size: 14px; margin: 0; font-weight: bold; }
    .header p { font-size: 8px; margin: 2px 0; }
    .divider { border-top: 1px dashed #000; margin: 3mm 0; }
    .receipt-info { font-size: 8px; margin-bottom: 3mm; }
    .receipt-info p { margin: 1px 0; }
    .items { font-size: 8px; margin-bottom: 3mm; }
    .item { display: flex; justify-content: space-between; margin: 1px 0; }
    .item-name { flex: 1; }
    .item-qty { width: 15px; text-align: center; }
    .item-price { width: 20px; text-align: right; }
    .total-section { font-size: 8px; margin-bottom: 3mm; }
    .total-row { display: flex; justify-content: space-between; margin: 1px 0; }
    .total-row.final { font-weight: bold; border-top: 1px solid #000; padding-top: 1mm; }
    .footer { text-align: center; font-size: 7px; margin-top: 3mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECEIPT</h1>
    <p>{{COMPANY_NAME}}</p>
  </div>

  <div class="divider"></div>

  <div class="receipt-info">
    <p>Receipt #: {{RECEIPT_ID}}</p>
    <p>Date: {{DATE}}</p>
    <p>Customer: {{CUSTOMER_NAME}}</p>
  </div>

  <div class="divider"></div>

  <div class="items">
    {{ITEMS}}
  </div>

  <div class="divider"></div>

  <div class="total-section">
    <div class="total-row">
      <span>Subtotal</span>
      <span>{{SUBTOTAL}}</span>
    </div>
    <div class="total-row">
      <span>Tax</span>
      <span>{{TAX}}</span>
    </div>
    <div class="total-row final">
      <span>TOTAL</span>
      <span>{{TOTAL}}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you!</p>
    <p>{{FOOTER_MESSAGE}}</p>
  </div>
</body>
</html>`,
    preview: 'Compact format for thermal/POS printers'
  }
]

interface ReceiptTemplateBuilderProps {
  onTemplateCreated?: () => void
}

export default function ReceiptTemplateBuilder({ onTemplateCreated }: ReceiptTemplateBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectTemplate = (template: TemplatePreset) => {
    setSelectedTemplate(template)
    setCustomName(template.name)
    setCustomDescription(template.description)
    setShowForm(true)
  }

  const handleCreateTemplate = async () => {
    if (!selectedTemplate || !customName) {
      setError('Please enter a template name')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await templateService.createTemplate({
        name: customName,
        description: customDescription,
        template_html: selectedTemplate.html,
      })

      setShowForm(false)
      setSelectedTemplate(null)
      setCustomName('')
      setCustomDescription('')
      
      if (onTemplateCreated) {
        onTemplateCreated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
          <Plus size={24} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receipt Template Builder</h2>
          <p className="text-gray-600 mt-1">Choose from pre-designed templates or create your own</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATE_PRESETS.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{template.description}</p>
              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 h-24 overflow-hidden">
                <p className="whitespace-pre-wrap break-words">{template.preview}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template)
                    setShowPreview(true)
                  }}
                  className="flex-1"
                >
                  <Eye size={16} />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSelectTemplate(template)}
                  className="flex-1"
                >
                  <Plus size={16} />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <Dialog open={true} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name} - Preview</DialogTitle>
            </DialogHeader>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <iframe
                srcDoc={selectedTemplate.html}
                className="w-full h-96 border border-gray-300 rounded"
                title="Template Preview"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(selectedTemplate.html)
                }}
                className="flex-1"
              >
                <Copy size={16} />
                Copy HTML
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false)
                  handleSelectTemplate(selectedTemplate)
                }}
                className="flex-1"
              >
                <Plus size={16} />
                Use This Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Template Modal */}
      {showForm && selectedTemplate && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Template from {selectedTemplate.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter template description"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>Available Variables:</strong>
                  <br />
                  <code className="text-xs whitespace-pre-wrap break-words">
                    {`{{RECEIPT_ID}}, {{DATE}}, {{CUSTOMER_NAME}}, {{CUSTOMER_EMAIL}}, {{ITEMS}}, {{TOTAL}}, {{SUBTOTAL}}, {{TAX}}, {{STATUS}}`}
                  </code>
                </p>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSelectedTemplate(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
