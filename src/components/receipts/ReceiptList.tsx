import { useEffect, useState } from 'react'
import type { Receipt, ReceiptTemplate, ReceiptItem } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, AlertCircle, FileText, Search, Edit, Trash2, CheckCircle, Clock, Download, Eye, X } from 'lucide-react'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import ReceiptDetailsPage from './ReceiptDetailsPage'

export default function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsReceiptId, setDetailsReceiptId] = useState<string | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    template_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [receiptsData, templatesData, productsData] = await Promise.all([
        receiptService.getAllReceipts(),
        templateService.getAllTemplates(),
        productService.getAllProducts(),
      ])
      setReceipts(receiptsData)
      setTemplates(templatesData)
      setProducts(productsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
    setSelectedReceipt(null)
    setFormData({
      customer_name: '',
      customer_email: '',
      template_id: '',
    })
    setItems([])
    setSelectedProductId('')
    setItemQuantity('1')
    setShowForm(true)
  }

  const handleEdit = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setFormData({
      customer_name: receipt.customer_name,
      customer_email: receipt.customer_email,
      template_id: receipt.template_id,
    })
    setItems([])
    setSelectedProductId('')
    setItemQuantity('1')
    setShowForm(true)
  }

  const addItem = () => {
    if (!selectedProductId || !itemQuantity) return

    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    const quantity = parseInt(itemQuantity)
    const total = product.price * quantity

    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(7),
      product_id: product.id,
      name: product.name,
      quantity,
      unit_price: product.price,
      total,
    }

    setItems([...items, newItem])
    setSelectedProductId('')
    setItemQuantity('1')
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return

    try {
      await receiptService.deleteReceipt(id)
      setReceipts(receipts.filter(r => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete receipt')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_name || !formData.customer_email || !formData.template_id) {
      setError('Please fill in all required fields')
      return
    }

    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }

    try {
      const totalAmount = calculateTotal()
      const tax = totalAmount * 0.1
      const subtotal = totalAmount - tax
      const receiptData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        template_id: formData.template_id,
        subtotal,
        tax,
        total: totalAmount,
      }

      let createdReceipt: Receipt
      if (selectedReceipt) {
        await receiptService.updateReceipt(selectedReceipt.id, receiptData)
        setShowForm(false)
        loadData()
      } else {
        createdReceipt = await receiptService.createReceipt(receiptData)
        // Add items to receipt object for preview
        createdReceipt.items = items
        setShowForm(false)
        setPreviewReceipt(createdReceipt)
        setShowPreview(true)
        loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt')
    }
  }

  const getTemplateName = (templateId: string) => {
    return templates.find(t => t.id === templateId)?.name || 'Unknown'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} className="text-green-600" />
      case 'sent':
        return <Clock size={16} className="text-blue-600" />
      default:
        return <Clock size={16} className="text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
    }
    return styles[status] || styles.draft
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading receipts...</p>
      </div>
    )
  }

  // Show details page if a receipt is selected
  if (showDetails && detailsReceiptId) {
    return (
      <ReceiptDetailsPage
        receiptId={detailsReceiptId}
        onBack={() => {
          setShowDetails(false)
          setDetailsReceiptId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
            <p className="text-gray-600 mt-1">Create and manage receipts</p>
          </div>
        </div>
        <Button onClick={handleAddNew} size="lg">
          <Plus size={20} />
          Create Receipt
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <Input
            type="text"
            placeholder="Search receipts by customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Receipt Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedReceipt ? 'Edit Receipt' : 'Create New Receipt'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Customer Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="Enter customer email"
                    required
                  />
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Receipt Template</h3>
                <div className="space-y-2">
                  <Label htmlFor="template">Select Template *</Label>
                  <select
                    id="template"
                    value={formData.template_id}
                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Selection */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-gray-900">Add Products</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="product">Product *</Label>
                      <select
                        id="product"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (${product.price})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        placeholder="1"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addItem}
                        className="w-full"
                        disabled={!selectedProductId || !itemQuantity}
                      >
                        <Plus size={16} />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Items ({items.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={items.length === 0}>
                  {selectedReceipt ? 'Update' : 'Create'} Receipt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipts List */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileText size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">
              {searchTerm ? 'No receipts found' : 'No receipts yet'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first receipt to get started.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddNew} className="mt-6">
                <Plus size={18} />
                Create First Receipt
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map((receipt) => (
            <Card key={receipt.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
              setDetailsReceiptId(receipt.id)
              setShowDetails(true)
            }}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{receipt.customer_name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{receipt.customer_email}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusBadge(receipt.status)}`}>
                    {getStatusIcon(receipt.status)}
                    {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Template</p>
                    <p className="font-medium text-gray-900">{getTemplateName(receipt.template_id)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-medium text-gray-900">{receipt.status}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewReceipt(receipt)
                      setShowPreview(true)
                    }}
                    className="flex-1"
                  >
                    <Eye size={16} />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(receipt)}
                    className="flex-1"
                  >
                    <Edit size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(receipt.id)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReceiptPreviewModal
        open={showPreview}
        receipt={previewReceipt}
        template={previewReceipt ? templates.find(t => t.id === previewReceipt.template_id) : null}
        onClose={() => {
          setShowPreview(false)
          setPreviewReceipt(null)
        }}
      />
    </div>
  )
}
