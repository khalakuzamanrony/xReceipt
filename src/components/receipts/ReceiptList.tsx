import { useEffect, useState } from 'react'
import type { Receipt, ReceiptItem } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Plus, AlertCircle, FileText, Search, Edit, Trash2, Eye, Clock, CheckCircle, X, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import ReceiptDetailsPage from './ReceiptDetailsPage'

export default function ReceiptList() {
  const { role, permissions } = useAuth()
  const canViewReceipts = role === 'grand_user' || !!permissions?.can_view_receipts
  const canCreateReceipts = role === 'grand_user' || !!permissions?.can_create_receipts
  const { activeVendorId, loading: vendorLoading } = useVendor()
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
    customer_company: '',
    customer_phone: '',
    customer_address: '',
    template_id: '',
  })

  useEffect(() => {
    if (vendorLoading) return

    if (role === 'admin' && !activeVendorId) {
      setReceipts([])
      setTemplates([])
      setProducts([])
      setLoading(false)
      return
    }

    void loadData(activeVendorId)
  }, [vendorLoading, activeVendorId, role])

  const loadData = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const vendorFilter = vendorId ?? undefined
      const [receiptsData, templatesData, productsData] = await Promise.all([
        receiptService.getAllReceipts(vendorFilter),
        templateService.getAllTemplates(vendorFilter),
        productService.getAllProducts(vendorFilter),
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
      customer_company: '',
      customer_phone: '',
      customer_address: '',
      template_id: '',
    })
    setItems([])
    setSelectedProductId('')
    setItemQuantity('1')
    setShowForm(true)
  }

  const handleEdit = async (receipt: Receipt) => {
    try {
      // Fetch the full receipt with items
      const fullReceipt = await receiptService.getReceiptById(receipt.id)
      if (!fullReceipt) {
        setError('Receipt not found')
        return
      }
      
      setSelectedReceipt(fullReceipt)
      setFormData({
        customer_name: fullReceipt.customer_name,
        customer_email: fullReceipt.customer_email,
        customer_company: fullReceipt.customer_company || '',
        customer_phone: fullReceipt.customer_phone || '',
        customer_address: fullReceipt.customer_address || '',
        template_id: fullReceipt.template_id,
      })
      // Load existing items if available
      setItems(fullReceipt.items || [])
      setSelectedProductId('')
      setItemQuantity('1')
      setShowForm(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt')
    }
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
      const receiptData: any = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_company: formData.customer_company || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_address: formData.customer_address || undefined,
        template_id: formData.template_id,
        subtotal,
        tax,
        total: totalAmount,
        items, // Include items in the receipt data
      }

      if (activeVendorId) {
        receiptData.vendor_id = activeVendorId
      }

      let createdReceipt: Receipt
      if (selectedReceipt) {
        await receiptService.updateReceipt(selectedReceipt.id, receiptData)
        setShowForm(false)
        loadData()
      } else {
        createdReceipt = await receiptService.createReceipt(receiptData)
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

  if (loading || vendorLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading receipts...</p>
      </div>
    )
  }

  if (role === 'admin' && !activeVendorId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FileText size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">No vendor assigned</p>
        <p className="text-gray-500 text-sm mt-1">You are not assigned to any vendor. Please contact a Grand User.</p>
      </div>
    )
  }

  if (!canViewReceipts) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FileText size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Receipts</p>
        <p className="text-gray-500 text-sm mt-1">Contact a Grand User if you think this is a mistake.</p>
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
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your receipts</p>
          </div>

          {/* Search Bar - Inline with Button */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            {/* Add Button */}
            {canCreateReceipts && (
              <Button onClick={handleAddNew} size="sm">
                <Plus size={16} />
                New Receipt
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Receipt Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {selectedReceipt ? 'Edit Receipt' : 'New Receipt'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info Section */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700">Customer Name</Label>
                  <Input
                    id="customer_name"
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="mt-1 border-0 bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customer_email" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="john@example.com"
                      required
                      className="mt-1 border-0 bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer_phone" className="text-sm font-medium text-gray-700">Phone</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="mt-1 border-0 bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="customer_company" className="text-sm font-medium text-gray-700">Company</Label>
                  <Input
                    id="customer_company"
                    type="text"
                    value={formData.customer_company}
                    onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                    placeholder="Client company name"
                    className="mt-1 border-0 bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_address" className="text-sm font-medium text-gray-700">Address</Label>
                  <Input
                    id="customer_address"
                    type="text"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    placeholder="Street, City, ZIP"
                    className="mt-1 border-0 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <Label htmlFor="template" className="text-sm font-medium text-gray-700">Receipt Template</Label>
                <select
                  id="template"
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border-0 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
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

              {/* Add Products Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Items</h3>
                  {items.length > 0 && (
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>

                {/* Items Table Header */}
                {items.length > 0 && (
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="col-span-5 text-xs font-semibold text-gray-600">Product</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600">Qty</div>
                    <div className="col-span-3 text-xs font-semibold text-gray-600 text-right">Amount</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 text-right">Action</div>
                  </div>
                )}

                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                        <div className="col-span-5">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-600">${item.unit_price.toFixed(2)} each</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
                        </div>
                        <div className="col-span-3 text-right">
                          <p className="text-sm font-semibold text-gray-900">${item.total.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                            title="Remove item"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item Row */}
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-3 py-2 border-0 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        placeholder="Qty"
                        className="border-0 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <button
                        type="button"
                        onClick={addItem}
                        disabled={!selectedProductId || !itemQuantity}
                        className="w-full h-9 px-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total Summary */}
                {items.length > 0 && (
                  <div className="bg-blue-50 rounded-md p-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                    <p className="text-lg font-bold text-blue-600">${calculateTotal().toFixed(2)}</p>
                  </div>
                )}

                {/* Empty State */}
                {items.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">No items added yet</p>
                    <p className="text-xs text-gray-500 mt-1">Add products below to create receipt</p>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={items.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {selectedReceipt ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipts Table */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <FileText size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No receipts found' : 'No receipts yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first receipt to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" 
                        onClick={() => {
                          setDetailsReceiptId(receipt.id)
                          setShowDetails(true)
                        }}
                      >
                        {receipt.customer_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{receipt.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{getTemplateName(receipt.template_id)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(receipt.status)}`}>
                        {getStatusIcon(receipt.status)}
                        {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewReceipt(receipt)
                            setShowPreview(true)
                          }}
                          title="Preview"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewReceipt(receipt)
                            setShowPreview(true)
                          }}
                          title="Download / Export"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Download size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(receipt)}
                          title="Edit"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receipt.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
