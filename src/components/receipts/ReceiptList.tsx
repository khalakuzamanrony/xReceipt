import { useEffect, useState } from 'react'
import type { Receipt, ReceiptItem, Vendor } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, AlertCircle, FileText, Search, Edit, Trash2, Eye, X, Download, ArrowUpDown, Funnel } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import ReceiptDetailsPage from './ReceiptDetailsPage'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as ToastPrimitive from '@radix-ui/react-toast'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export default function ReceiptList() {
  const { role, permissions } = useAuth()
  const { memberships, activeVendorId, loading: vendorLoading } = useVendor()

  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const canViewReceipts =
    role === 'grand_user' ||
    isVendorSuperAdminForActiveVendor ||
    !!permissions?.can_view_receipts

  const canCreateReceipts =
    role === 'grand_user' ||
    isVendorSuperAdminForActiveVendor ||
    !!permissions?.can_create_receipts
  const canCreateProducts =
    role === 'grand_user' ||
    isVendorSuperAdminForActiveVendor ||
    !!permissions?.can_create_products
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all')
  const [templateFilter, setTemplateFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [autoDownloadMode, setAutoDownloadMode] = useState<'none' | 'pdf' | 'png'>('none')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemImeiOrModel, setItemImeiOrModel] = useState('')
  const [itemColor, setItemColor] = useState('')
  const [formData, setFormData] = useState({
    company_name: '',
    customer_name: '',
    customer_email: '',
    customer_company: '',
    customer_phone: '',
    customer_address: '',
    template_id: '',
  })
  const [toastOpen, setToastOpen] = useState(false)
  const [toastTitle, setToastTitle] = useState('')
  const [toastDescription, setToastDescription] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [quickProductName, setQuickProductName] = useState('')
  const [quickProductPrice, setQuickProductPrice] = useState('')
  const [quickProductDescription, setQuickProductDescription] = useState('')
  const [quickProductSaving, setQuickProductSaving] = useState(false)
  const [quickProductError, setQuickProductError] = useState<string | null>(null)
  const [showQuickProductForm, setShowQuickProductForm] = useState(false)

  const assignedProductIds = permissions?.assigned_product_ids || []
  const assignedTemplateIds = permissions?.assigned_template_ids || []

  const vendors: Vendor[] = memberships.map((m) => m.vendor)
  const activeVendorName = activeVendorId ? vendors.find((v) => v.id === activeVendorId)?.name || '' : ''

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

  const searchFilteredReceipts = receipts.filter(
    (receipt) =>
      receipt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  let filteredReceipts = searchFilteredReceipts

  if (statusFilter !== 'all') {
    filteredReceipts = filteredReceipts.filter((receipt) => receipt.status === statusFilter)
  }

  if (templateFilter !== 'all') {
    filteredReceipts = filteredReceipts.filter((receipt) => receipt.template_id === templateFilter)
  }

  if (dateRangeFilter !== 'all') {
    const now = new Date()

    filteredReceipts = filteredReceipts.filter((receipt) => {
      const created = new Date(receipt.created_at)

      if (Number.isNaN(created.getTime())) return false

      if (dateRangeFilter === 'today') {
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        )
      }

      const diffMs = now.getTime() - created.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (dateRangeFilter === '7d') {
        return diffDays <= 7
      }

      if (dateRangeFilter === '30d') {
        return diffDays <= 30
      }

      return true
    })
  }

  const minAmountValue = minAmount.trim() !== '' ? Number(minAmount) : null
  const maxAmountValue = maxAmount.trim() !== '' ? Number(maxAmount) : null

  if (minAmountValue !== null && !Number.isNaN(minAmountValue)) {
    filteredReceipts = filteredReceipts.filter((receipt) => (receipt.total ?? 0) >= minAmountValue)
  }

  if (maxAmountValue !== null && !Number.isNaN(maxAmountValue)) {
    filteredReceipts = filteredReceipts.filter((receipt) => (receipt.total ?? 0) <= maxAmountValue)
  }

  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    const aTotal = a.total ?? 0
    const bTotal = b.total ?? 0
    return sortDirection === 'asc' ? aTotal - bTotal : bTotal - aTotal
  })

  const totalReceipts = sortedReceipts.length
  const totalPages = Math.max(1, Math.ceil(totalReceipts / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedReceipts = sortedReceipts.slice(startIndex, startIndex + rowsPerPage)

  const handleAddNew = () => {
    // Require a vendor selection before creating receipts
    if (!activeVendorId) {
      setError('Please select a shop from the header before creating receipts.')
      return
    }

    setSelectedReceipt(null)
    setFormData({
      company_name: activeVendorName,
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
      const vendorNameForReceipt = fullReceipt.vendor_id
        ? vendors.find((v) => v.id === fullReceipt.vendor_id)?.name || ''
        : ''
      setFormData({
        company_name: fullReceipt.company_name || vendorNameForReceipt,
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

    const permissionFilteredProducts =
      role === 'admin' &&
      !isVendorSuperAdminForActiveVendor &&
      permissions?.can_view_products &&
      assignedProductIds.length > 0
        ? products.filter((p) => assignedProductIds.includes(p.id))
        : products

    const product = permissionFilteredProducts.find(p => p.id === selectedProductId)
    if (!product) return

    const quantity = parseInt(itemQuantity)
    const total = product.price * quantity

    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(7),
      product_id: product.id,
      name: product.name,
      imei_or_model: itemImeiOrModel.trim() ? itemImeiOrModel.trim() : null,
      color: itemColor.trim() ? itemColor.trim() : null,
      quantity,
      unit_price: product.price,
      total,
    }

    setItems([...items, newItem])
    setSelectedProductId('')
    setItemQuantity('1')
    setItemImeiOrModel('')
    setItemColor('')
  }

  const handleQuickCreateProduct = async () => {
    if (!activeVendorId) {
      setQuickProductError('Please select a shop from the header before creating products.')
      return
    }

    if (!quickProductName.trim() || !quickProductPrice.trim()) {
      setQuickProductError('Please enter product name and price.')
      return
    }

    const price = parseFloat(quickProductPrice)
    if (!Number.isFinite(price) || price <= 0) {
      setQuickProductError('Please enter a valid price greater than 0.')
      return
    }

    try {
      setQuickProductSaving(true)
      setQuickProductError(null)

      const productData: any = {
        name: quickProductName.trim(),
        description: quickProductDescription.trim() || null,
        price,
        category_id: null,
        vendor_id: activeVendorId,
      }

      const newProduct = await productService.createProduct(productData)
      setProducts((prev) => [newProduct, ...prev])
      setSelectedProductId(newProduct.id)
      setShowQuickProductForm(false)
      setQuickProductName('')
      setQuickProductPrice('')
      setQuickProductDescription('')
      showToast('Product created', 'New product added to your catalog.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create product'
      setQuickProductError(message)
      showToast('Failed to create product', message, 'error')
    } finally {
      setQuickProductSaving(false)
    }
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const showToast = (title: string, description = '', variant: 'success' | 'error' = 'success') => {
    setToastTitle(title)
    setToastDescription(description)
    setToastVariant(variant)
    setToastOpen(true)
  }

  const handleRequestDelete = (receipt: Receipt) => {
    setReceiptToDelete(receipt)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!receiptToDelete) return

    try {
      setIsDeleting(true)
      await receiptService.deleteReceipt(receiptToDelete.id)
      setReceipts((prev) => prev.filter((r) => r.id !== receiptToDelete.id))
      setShowDeleteConfirm(false)
      setReceiptToDelete(null)
      showToast('Receipt deleted', 'The receipt has been deleted.', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete receipt')
      const message = err instanceof Error ? err.message : 'Failed to delete receipt'
      showToast('Failed to delete receipt', message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDetails = (receipt: Receipt) => {
    setDetailsReceiptId(receipt.id)
    setShowDetails(true)
  }

  const toggleTotalSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const getAssignedVendorsForReceipt = (receipt: Receipt): Vendor[] => {
    if (!receipt.vendor_id) return []
    const vendor = vendors.find((v) => v.id === receipt.vendor_id)
    return vendor ? [vendor] : []
  }

  const handleAssignVendorToReceipt = async (receipt: Receipt, vendorId: string | null) => {
    try {
      const update: Partial<Receipt> = {
        vendor_id: vendorId,
      }
      await receiptService.updateReceipt(receipt.id, update)
      setReceipts((prev) =>
        prev.map((r) => (r.id === receipt.id ? { ...r, vendor_id: vendorId } : r)),
      )
      showToast(
        'Assigned shop updated',
        vendorId ? 'The receipt has been assigned to the selected shop.' : 'Shop assignment removed.',
        'success',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update assigned shop'
      setError(message)
      showToast('Failed to update shop', message, 'error')
    }
  }

  const openPreview = async (receipt: Receipt, mode: 'view' | 'download') => {
    try {
      const fullReceipt = await receiptService.getReceiptById(receipt.id)
      if (!fullReceipt) {
        setError('Receipt not found')
        showToast('Receipt not found', 'The selected receipt could not be loaded.', 'error')
        return
      }
      setPreviewReceipt(fullReceipt)
      setAutoDownloadMode(mode === 'download' ? 'pdf' : 'none')
      setShowPreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt preview')
      const message = err instanceof Error ? err.message : 'Failed to load receipt preview'
      showToast('Failed to load preview', message, 'error')
    }
  }

  const buildReceiptHtml = (receipt: Receipt, templateHtml: string) => {
    const subtotal = receipt.subtotal || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    let itemsColumns: Array<'description' | 'imei_or_model' | 'color' | 'quantity' | 'price' | 'total'> = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = templateHtml.match(/data-items-columns="([a-z_,]+)"/)
    if (itemsColumnsMatch && itemsColumnsMatch[1]) {
      const parts = itemsColumnsMatch[1].split(',').map(p => p.trim()).filter(Boolean)
      const valid: Array<'description' | 'imei_or_model' | 'color' | 'quantity' | 'price' | 'total'> = []
      for (const col of parts) {
        if (
          col === 'description' ||
          col === 'imei_or_model' ||
          col === 'color' ||
          col === 'quantity' ||
          col === 'price' ||
          col === 'total'
        ) {
          valid.push(col)
        }
      }
      if (valid.length) {
        itemsColumns = valid
      }
    }

    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      const hasDedicatedImeiColumn = itemsColumns.includes('imei_or_model')
      const hasDedicatedColorColumn = itemsColumns.includes('color')

      itemsHTML = receipt.items
        .map((item) => {
          const cells = itemsColumns
            .map((col) => {
              if (col === 'description') {
                const metaParts: string[] = []
                if (!hasDedicatedImeiColumn && item.imei_or_model) {
                  metaParts.push(`IMEI/Model: ${item.imei_or_model}`)
                }
                if (!hasDedicatedColorColumn && item.color) {
                  metaParts.push(`Color: ${item.color}`)
                }
                const metaHtml = metaParts.length
                  ? `<div style="margin-top: 2px; font-size: 11px; color: #666;">${metaParts.join(' · ')}</div>`
                  : ''

                return `<td style="padding: 8px; border-bottom: 1px solid #eee;"><div>${item.name}</div>${metaHtml}</td>`
              }
              if (col === 'imei_or_model') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.imei_or_model || ''}</td>`
              }
              if (col === 'color') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.color || ''}</td>`
              }
              if (col === 'quantity') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>`
              }
              if (col === 'price') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unit_price.toFixed(2)}</td>`
              }
              if (col === 'total') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.total.toFixed(2)}</td>`
              }
              return ''
            })
            .join('')

          return `
        <tr>
          ${cells}
        </tr>
      `
        })
        .join('')
    } else {
      itemsHTML = `
        <tr>
          <td colspan="${itemsColumns.length}" style="text-align: center; padding: 10px; color: #999; font-size: 12px;">
            No items
          </td>
        </tr>
      `
    }

    const hasTaxableItems = receipt.items && receipt.items.length > 0 && tax > 0

    const companyName =
      receipt.company_name ||
      (receipt.vendor_id ? vendors.find((v) => v.id === receipt.vendor_id)?.name : null) ||
      'xReceipt'

    let html = templateHtml
      .replace(/{{RECEIPT_ID}}/g, receipt.id)
      .replace(/{{DATE}}/g, new Date(receipt.created_at).toLocaleDateString())
      .replace(/{{CUSTOMER_NAME}}/g, receipt.customer_name || '')
      .replace(/{{CUSTOMER_EMAIL}}/g, receipt.customer_email || '')
      .replace(/{{CUSTOMER_COMPANY}}/g, receipt.customer_company || '')
      .replace(/{{CUSTOMER_PHONE}}/g, receipt.customer_phone || '')
      .replace(/{{CUSTOMER_ADDRESS}}/g, receipt.customer_address || '')
      .replace(/{{ITEMS}}/g, itemsHTML)
      .replace(/{{TOTAL}}/g, total.toFixed(2))
      .replace(/{{SUBTOTAL}}/g, subtotal.toFixed(2))
      .replace(/{{TAX}}/g, hasTaxableItems ? tax.toFixed(2) : '0.00')
      .replace(/{{STATUS}}/g, receipt.status)
      .replace(/{{COMPANY_NAME}}/g, companyName)
      .replace(/{{COMPANY_EMAIL}}/g, 'info@xreceipt.com')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Thank you for your business!')

    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^^>]*>/g, '')
    }

    return html
  }

  const handleDirectDownload = async (receipt: Receipt) => {
    try {
      const fullReceipt = await receiptService.getReceiptById(receipt.id)
      if (!fullReceipt) {
        setError('Receipt not found')
        showToast('Receipt not found', 'The selected receipt could not be loaded.', 'error')
        return
      }

      const template = templates.find((t) => t.id === fullReceipt.template_id)
      if (!template) {
        setError('Template not found for this receipt')
        showToast('Template not found', 'The template for this receipt could not be loaded.', 'error')
        return
      }

      const html = buildReceiptHtml(fullReceipt, template.template_html)

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.backgroundColor = '#ffffff'
      container.innerHTML = html
      document.body.appendChild(container)

      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        })

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`receipt-${fullReceipt.id}.pdf`)
        showToast('Download started', 'Your receipt PDF is being downloaded.', 'success')
      } finally {
        document.body.removeChild(container)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download receipt PDF'
      setError(message)
      showToast('Failed to download receipt', message, 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_name || !formData.customer_email || !formData.template_id) {
      const message = 'Please fill in all required fields'
      setError(message)
      showToast('Missing fields', message, 'error')
      return
    }

    if (items.length === 0) {
      const message = 'Please add at least one item'
      setError(message)
      showToast('No items added', message, 'error')
      return
    }

    const isNew = !selectedReceipt

    // New receipts must always be tied to a specific vendor
    if (isNew && !activeVendorId) {
      setError('Please select a shop from the header before creating receipts.')
      return
    }

    try {
      const totalAmount = calculateTotal()
      const tax = totalAmount * 0.1
      const subtotal = totalAmount - tax
      const receiptData: any = {
        company_name: formData.company_name || activeVendorName || undefined,
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

      if (isNew && activeVendorId) {
        receiptData.vendor_id = activeVendorId
      }

      let createdReceipt: Receipt
      if (selectedReceipt) {
        await receiptService.updateReceipt(selectedReceipt.id, receiptData)
        setShowForm(false)
        loadData()
        showToast('Receipt updated', 'The receipt has been updated.', 'success')
      } else {
        createdReceipt = await receiptService.createReceipt(receiptData)
        // Ensure we have full receipt details (including items) for preview
        try {
          const fullCreated = await receiptService.getReceiptById(createdReceipt.id)
          if (fullCreated) {
            createdReceipt = fullCreated
          }
        } catch {
          // Fallback to createdReceipt if detailed fetch fails
        }
        setShowForm(false)
        setPreviewReceipt(createdReceipt)
        setAutoDownloadMode('none')
        setShowPreview(true)
        loadData()
        showToast('Receipt created', 'The new receipt has been created.', 'success')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save receipt'
      setError(message)
      showToast('Failed to save receipt', message, 'error')
    }
  }

  const getTemplateName = (templateId: string) => {
    return templates.find(t => t.id === templateId)?.name || 'Unknown'
  }

  const buildVendorInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')

  const getShortReceiptId = (receipt: Receipt) => {
    if (receipt.receipt_number) {
      return receipt.receipt_number
    }
    return receipt.id
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
        <p className="text-gray-800 font-semibold">No shop assigned</p>
        <p className="text-gray-500 text-sm mt-1">You are not assigned to any shop. Please contact a Grand User.</p>
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

          {/* Search and Filters */}
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 flex items-center gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <Funnel className="h-4 w-4" />
                    <span className="text-xs font-medium">Filters</span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-lg p-3 mr-1 mt-2 z-50 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[{ id: 'all', label: 'All' }, { id: 'draft', label: 'Draft' }, { id: 'sent', label: 'Sent' }, { id: 'paid', label: 'Paid' }].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setStatusFilter(option.id as 'all' | 'draft' | 'sent' | 'paid')}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors',
                              statusFilter === option.id
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Template</p>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setTemplateFilter('all')}
                          className={cn(
                            'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                            templateFilter === 'all'
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          All templates
                        </button>
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setTemplateFilter(template.id)}
                            className={cn(
                              'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                              templateFilter === template.id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Date range</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'all', label: 'All time' },
                          { id: 'today', label: 'Today' },
                          { id: '7d', label: 'Last 7 days' },
                          { id: '30d', label: 'Last 30 days' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setDateRangeFilter(option.id as 'all' | 'today' | '7d' | '30d')}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors',
                              dateRangeFilter === option.id
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Amount</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                          placeholder="Min"
                          className="h-8 w-20 text-[11px] border-gray-200"
                        />
                        <span className="text-[10px] text-gray-400">to</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(e.target.value)}
                          placeholder="Max"
                          className="h-8 w-20 text-[11px] border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('all')
                          setTemplateFilter('all')
                          setDateRangeFilter('all')
                          setMinAmount('')
                          setMaxAmount('')
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

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
          <DialogContent className="max-w-2xl w-full h-[90vh] p-0 flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
                <DialogTitle className="text-2xl">
                  {selectedReceipt ? 'Edit Receipt' : 'New Receipt'}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/40 space-y-6">
              <div>
                <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">Company Name</Label>
                <Input
                  id="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={activeVendorName || 'Company name on receipt'}
                  className="mt-1 border-0 bg-gray-50 focus:bg-white"
                />
              </div>

              {/* Customer Info Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Customer Info</h3>
                <div>
                  <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700" required>Customer Name</Label>
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
                    <Label htmlFor="customer_email" className="text-sm font-medium text-gray-700" required>Email Address</Label>
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
                <Label htmlFor="template" className="text-sm font-medium text-gray-700" required>Receipt Template</Label>
                {(() => {
                  const permissionFilteredTemplates =
                    role === 'admin' &&
                    !isVendorSuperAdminForActiveVendor &&
                    permissions?.can_view_templates &&
                    permissions?.can_assign_receipt_templates &&
                    assignedTemplateIds.length > 0
                      ? templates.filter((template) => assignedTemplateIds.includes(template.id))
                      : templates

                  return (
                    <select
                      id="template"
                      value={formData.template_id}
                      onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border-0 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      required
                    >
                      <option value="">Select a template</option>
                      {permissionFilteredTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )
                })()}
              </div>

              {/* Add Products Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Products</h3>
                  {items.length > 0 && (
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                      {items.length} {items.length === 1 ? 'product' : 'products'}
                    </span>
                  )}
                </div>

                {/* Items Table Header */}
                {items.length > 0 && (
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="col-span-5 text-xs font-semibold text-gray-600 uppercase">Product</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase">Qty</div>
                    <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase text-right">Amount</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Action</div>
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
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              type="text"
                              value={item.imei_or_model || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, imei_or_model: value || null } : it,
                                  ),
                                )
                              }}
                              placeholder="IMEI / Model"
                              className="h-8 bg-white text-xs"
                            />
                            <Input
                              type="text"
                              value={item.color || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, color: value || null } : it,
                                  ),
                                )
                              }}
                              placeholder="Color"
                              className="h-8 bg-white text-xs"
                            />
                          </div>
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
                            className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors cursor-pointer"
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
                      {(() => {
                        const permissionFilteredProducts =
                          role === 'admin' &&
                          permissions?.can_view_products &&
                          assignedProductIds.length > 0
                            ? products.filter((product) => assignedProductIds.includes(product.id))
                            : products

                        return (
                          <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full px-3 py-2 border-0 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                          >
                            <option value="">Select product</option>
                            {permissionFilteredProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - ${product.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        )
                      })()}
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
                        className="w-full h-9 px-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8">
                      <Input
                        type="text"
                        value={itemImeiOrModel}
                        onChange={(e) => setItemImeiOrModel(e.target.value)}
                        placeholder="IMEI / Model (optional)"
                        className="border-0 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="text"
                        value={itemColor}
                        onChange={(e) => setItemColor(e.target.value)}
                        placeholder="Color (optional)"
                        className="border-0 bg-white text-sm"
                      />
                    </div>
                  </div>

                  {canCreateProducts && (
                    <div className="pt-2 border-t border-dashed border-gray-200 space-y-2">
                      {!showQuickProductForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickProductForm(true)
                            setQuickProductError(null)
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          + Quick add new product
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {quickProductError && (
                            <p className="text-xs text-red-600">{quickProductError}</p>
                          )}
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5">
                              <Input
                                type="text"
                                value={quickProductName}
                                onChange={(e) => setQuickProductName(e.target.value)}
                                placeholder="Product name"
                                className="bg-white text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={quickProductPrice}
                                onChange={(e) => setQuickProductPrice(e.target.value)}
                                placeholder="Price"
                                className="bg-white text-sm"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                type="text"
                                value={quickProductDescription}
                                onChange={(e) => setQuickProductDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="bg-white text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowQuickProductForm(false)
                                setQuickProductError(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleQuickCreateProduct}
                              disabled={quickProductSaving}
                            >
                              {quickProductSaving ? 'Saving...' : 'Save product'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                    <p className="text-sm text-gray-600">No products added yet</p>
                    <p className="text-xs text-gray-500 mt-1">Add products below to create receipt</p>
                  </div>
                )}
              </div>

              </div>

              <DialogFooter className="gap-3 px-6 py-4 border-t border-gray-200 bg-white flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={items.length === 0}
                >
                  {selectedReceipt ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipts Table */}
      {sortedReceipts.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receipt ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created At</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    <button
                      type="button"
                      onClick={toggleTotalSort}
                      className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                    >
                      <span className='uppercase'>Total Amount</span>
                      <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedReceipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDetails(receipt)}
                  >
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {receipt.customer_name}
                        </p>
                        {receipt.customer_email && (
                          <p className="text-xs text-gray-500">{receipt.customer_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-700">{getShortReceiptId(receipt)}</p>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        // Prevent opening details when interacting with the assign dropdown
                        e.stopPropagation()
                      }}
                    >
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center -space-x-1 px-0 py-0 cursor-pointer bg-transparent border-0"
                          >
                            {(() => {
                              const assignedVendors = getAssignedVendorsForReceipt(receipt)

                              if (assignedVendors.length === 0) {
                                return <span className="text-xs text-gray-400">Unassigned</span>
                              }

                              return (
                                <div className="flex -space-x-1">
                                  {assignedVendors.slice(0, 3).map((v) =>
                                    v.image_url ? (
                                      <img
                                        key={v.id}
                                        src={v.image_url}
                                        alt={v.name}
                                        className="w-7 h-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span
                                        key={v.id}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
                                      >
                                        {buildVendorInitials(v.name)}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )
                            })()}
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className="min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-2 z-50 space-y-1">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase px-1 pb-1">
                              Assign shop
                            </p>
                            {vendors.map((vendor) => {
                              const isAssigned = receipt.vendor_id === vendor.id
                              const vendorInitials = buildVendorInitials(vendor.name)

                              return (
                                <DropdownMenu.Item
                                  key={vendor.id}
                                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                  onSelect={(event) => {
                                    event.preventDefault()
                                    void handleAssignVendorToReceipt(receipt, isAssigned ? null : vendor.id)
                                  }}
                                >
                                  <span
                                    className={cn(
                                      'inline-flex h-3 w-3 rounded-full border border-gray-300',
                                      isAssigned && 'border-blue-500 bg-blue-500',
                                    )}
                                  />
                                  {vendor.image_url ? (
                                    <img
                                      src={vendor.image_url}
                                      alt={vendor.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                      {vendorInitials}
                                    </span>
                                  )}
                                  <span className="flex-1 truncate">{vendor.name}</span>
                                </DropdownMenu.Item>
                              )
                            })}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{getTemplateName(receipt.template_id)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {new Date(receipt.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${ (receipt.total ?? 0).toFixed(2) }
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            void openPreview(receipt, 'view')
                          }}
                          title="Preview"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDirectDownload(receipt)
                          }}
                          title="Download PDF"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Download size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(receipt)
                          }}
                          title="Edit"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRequestDelete(receipt)
                          }}
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

          {/* Pagination */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {totalReceipts === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalReceipts)} of {totalReceipts}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 10
                    setRowsPerPage(value)
                    setPage(1)
                  }}
                  className="h-7 border border-gray-300 rounded-md text-xs text-gray-900 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && receiptToDelete && (
        <Dialog
          open={showDeleteConfirm}
          onOpenChange={(open) => {
            setShowDeleteConfirm(open)
            if (!open) {
              setReceiptToDelete(null)
            }
          }}
        >
          <DialogContent className="max-w-sm w-full p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg">Delete Receipt</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this receipt for{' '}
                <span className="font-semibold">{receiptToDelete.customer_name}</span>?
              </p>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setReceiptToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ReceiptPreviewModal
        open={showPreview}
        receipt={previewReceipt}
        template={previewReceipt ? templates.find(t => t.id === previewReceipt.template_id) : null}
        autoDownloadMode={autoDownloadMode}
        onAutoDownloadComplete={() => setAutoDownloadMode('none')}
        onClose={() => {
          setShowPreview(false)
          setPreviewReceipt(null)
          setAutoDownloadMode('none')
        }}
      />

      {/* Toast notifications */}
      <ToastPrimitive.Provider swipeDirection="right">
        <ToastPrimitive.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className={cn(
            'rounded-lg border px-4 py-3 shadow-lg bg-white text-sm flex flex-col gap-1',
            toastVariant === 'success' && 'border-green-200',
            toastVariant === 'error' && 'border-red-200',
          )}
        >
          <ToastPrimitive.Title className="font-semibold text-gray-900">
            {toastTitle}
          </ToastPrimitive.Title>
          {toastDescription && (
            <ToastPrimitive.Description className="text-gray-600">
              {toastDescription}
            </ToastPrimitive.Description>
          )}
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-72 max-w-full outline-none" />
      </ToastPrimitive.Provider>
    </div>
  )
}
