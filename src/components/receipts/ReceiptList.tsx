import { useEffect, useMemo, useState } from 'react'
import type { Product, Receipt, ReceiptItem, Vendor } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, AlertCircle, FileText, Search, Edit, Trash2, Eye, Download, ArrowUpDown, Funnel, ChevronDown, Check, X, Building2, User, Package, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import ReceiptDetailsPage from './ReceiptDetailsPage'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Select from '@radix-ui/react-select'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ReceiptList() {
  const { role } = useAuth()
  const { memberships, activeVendorId, activeVendor, permissions, loading: vendorLoading } = useVendor()
  const { toast } = useToast()

  const isGrandUserAllShops = role === 'grand_user' && !activeVendorId
  const isPausedVendor = role === 'grand_user' && !!activeVendorId && activeVendor?.status === 'inactive'

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
  const [products, setProducts] = useState<Product[]>([])
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
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemImeiOrModel, setItemImeiOrModel] = useState('')
  const [itemColor, setItemColor] = useState('')
  const [itemTaxEnabled, setItemTaxEnabled] = useState(true)
  const [itemTaxPercentage, setItemTaxPercentage] = useState('0')
  const [itemDiscountEnabled, setItemDiscountEnabled] = useState(false)
  const [itemDiscountType, setItemDiscountType] = useState<'none' | 'percentage' | 'flat'>('none')
  const [itemDiscountValue, setItemDiscountValue] = useState('0')

  const [taxMode, setTaxMode] = useState<'individual' | 'collective'>('individual')
  const [discountMode, setDiscountMode] = useState<'individual' | 'collective'>('individual')
  const [individualTaxBackup, setIndividualTaxBackup] = useState<Record<string, { tax_enabled?: boolean; tax_percentage?: number }>>({})
  const [individualDiscountBackup, setIndividualDiscountBackup] = useState<
    Record<string, { discount_enabled?: boolean; discount_type?: 'none' | 'percentage' | 'flat'; discount_value?: number }>
  >({})
  const [formData, setFormData] = useState({
    company_name: '',
    company_logo: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_city: '',
    company_zip: '',
    company_website: '',
    company_tax_id: '',
    customer_name: '',
    customer_email: '',
    customer_company: '',
    customer_phone: '',
    customer_address: '',
    template_id: '',
    tax_percent: '0',
    discount_type: 'none' as 'none' | 'percentage' | 'flat',
    discount_value: '0',
    notes: '',
    footer_message: '',
  })
  const [companyInfoEdited, setCompanyInfoEdited] = useState(false)
  const [footerNotesEdited, setFooterNotesEdited] = useState(false)
  const showToast = (title: string, description = '', variant: 'success' | 'error' = 'success') => {
    toast(title, description, variant)
  }
  const [quickProductName, setQuickProductName] = useState('')
  const [quickProductPrice, setQuickProductPrice] = useState('')
  const [quickProductDescription, setQuickProductDescription] = useState('')
  const [quickProductImeiOrModel, setQuickProductImeiOrModel] = useState('')
  const [quickProductColor, setQuickProductColor] = useState('')
  const [quickProductTaxEnabled, setQuickProductTaxEnabled] = useState(true)
  const [quickProductTaxPercentage, setQuickProductTaxPercentage] = useState('0')
  const [quickProductDiscountEnabled, setQuickProductDiscountEnabled] = useState(false)
  const [quickProductDiscountType, setQuickProductDiscountType] = useState<'none' | 'percentage' | 'flat'>('none')
  const [quickProductDiscountValue, setQuickProductDiscountValue] = useState('0')
  const [quickProductSaving, setQuickProductSaving] = useState(false)
  const [quickProductError, setQuickProductError] = useState<string | null>(null)
  const [showQuickProductForm, setShowQuickProductForm] = useState(false)

  const [modalTemplates, setModalTemplates] = useState<any[]>([])

  const assignedProductIds = permissions?.assigned_product_ids || []

  const vendors: Vendor[] = memberships.map((m) => m.vendor)
  const activeVendorName = activeVendorId ? vendors.find((v) => v.id === activeVendorId)?.name || '' : ''

  const vendorIdForReceiptModal = activeVendorId || selectedReceipt?.vendor_id || null

  const safeNumber = (value: unknown) => {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const clampPercent = (value: unknown) => {
    const n = safeNumber(value)
    return Math.min(100, Math.max(0, n))
  }

  // Helper functions to extract builder data from template HTML
  const decodeBuilderData = (encoded: string): any | null => {
    try {
      const json = decodeURIComponent(escape(atob(encoded)))
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  const extractBuilderData = (templateHtml: string): any | null => {
    const match = templateHtml.match(
      /<!--\s*XRECEIPT_CUSTOM_TEMPLATE_BUILDER:([A-Za-z0-9+/=]+)\s*-->/,
    )
    if (!match || !match[1]) return null
    return decodeBuilderData(match[1])
  }

  const getItemBreakdown = (item: ReceiptItem) => {
    const quantity = Math.max(1, Math.trunc(safeNumber(item.quantity)))
    const unitPrice = Math.max(0, safeNumber(item.unit_price))
    const lineSubtotal = unitPrice * quantity

    const discountEnabled = item.discount_enabled === true
    const discountType = discountEnabled
      ? item.discount_type && item.discount_type !== 'none'
        ? item.discount_type
        : 'percentage'
      : 'none'
    const discountValueRaw = Math.max(0, safeNumber(item.discount_value))
    const discountValue =
      discountType === 'percentage'
        ? clampPercent(discountValueRaw)
        : discountType === 'flat'
          ? Math.min(unitPrice, Math.max(0, Math.floor(discountValueRaw)))
          : 0
    const discountAmountRaw =
      discountType === 'percentage'
        ? lineSubtotal * (discountValue / 100)
        : discountType === 'flat'
          ? discountValue * quantity
          : 0
    const lineDiscount = Math.min(Math.max(0, discountAmountRaw), lineSubtotal)

    const taxEnabled = item.tax_enabled !== false
    const taxPercentage = clampPercent(item.tax_percentage)
    const taxableBase = Math.max(0, lineSubtotal - lineDiscount)
    const lineTax = taxEnabled ? taxableBase * (taxPercentage / 100) : 0

    const lineTotal = taxableBase + lineTax

    return { lineSubtotal, lineDiscount, lineTax, lineTotal }
  }

  const recalculateItemTotal = (item: ReceiptItem) => {
    const { lineTotal } = getItemBreakdown(item)
    return { ...item, total: lineTotal }
  }

  const receiptItemTotals = useMemo(() => {
    let subtotal = 0
    let itemDiscount = 0
    let itemTax = 0
    for (const item of items) {
      const { lineSubtotal, lineDiscount, lineTax } = getItemBreakdown(item)
      subtotal += lineSubtotal
      itemDiscount += discountMode === 'individual' ? lineDiscount : 0
      itemTax += taxMode === 'individual' ? lineTax : 0
    }
    const netAfterItemDiscount = Math.max(0, subtotal - itemDiscount)

    const receiptDiscountType = discountMode === 'collective' ? formData.discount_type : 'none'
    const receiptDiscountValueRaw = discountMode === 'collective' ? Math.max(0, safeNumber(formData.discount_value)) : 0
    const receiptDiscountValue =
      receiptDiscountType === 'percentage'
        ? clampPercent(receiptDiscountValueRaw)
        : receiptDiscountType === 'flat'
          ? Math.max(0, Math.floor(receiptDiscountValueRaw))
          : 0
    const receiptDiscountAmountRaw =
      receiptDiscountType === 'percentage'
        ? netAfterItemDiscount * (receiptDiscountValue / 100)
        : receiptDiscountType === 'flat'
          ? receiptDiscountValue
          : 0
    const receiptDiscount = Math.min(Math.max(0, receiptDiscountAmountRaw), netAfterItemDiscount)

    const netAfterAllDiscounts = Math.max(0, netAfterItemDiscount - receiptDiscount)
    const receiptTaxPercent = taxMode === 'collective' ? clampPercent(formData.tax_percent) : 0
    const receiptTax = netAfterAllDiscounts * (receiptTaxPercent / 100)

    const totalDiscount = itemDiscount + receiptDiscount
    const totalTax = itemTax + receiptTax
    const total = netAfterAllDiscounts + totalTax

    return {
      itemsSubtotal: subtotal,
      itemsDiscount: itemDiscount,
      itemsTax: itemTax,
      receiptDiscount,
      receiptTax,
      totalDiscount,
      totalTax,
      total,
    }
  }, [items, formData.discount_type, formData.discount_value, formData.tax_percent, taxMode, discountMode])

  useEffect(() => {
    if (!showForm) return

    if (taxMode === 'collective') {
      setIndividualTaxBackup((prev) => {
        const next = { ...prev }
        for (const it of items) {
          if (!next[it.id]) {
            next[it.id] = { tax_enabled: it.tax_enabled, tax_percentage: it.tax_percentage }
          }
        }
        return next
      })
      setItems((prev) => prev.map((it) => recalculateItemTotal({ ...it, tax_enabled: false, tax_percentage: 0 })))
    }
    if (taxMode === 'individual') {
      setItems((prev) =>
        prev.map((it) => {
          const backup = individualTaxBackup[it.id]
          if (!backup) return it
          return recalculateItemTotal({
            ...it,
            tax_enabled: backup.tax_enabled,
            tax_percentage: backup.tax_percentage,
          })
        }),
      )
    }
  }, [taxMode])

  useEffect(() => {
    if (!showForm) return

    if (discountMode === 'collective') {
      setIndividualDiscountBackup((prev) => {
        const next = { ...prev }
        for (const it of items) {
          if (!next[it.id]) {
            next[it.id] = {
              discount_enabled: it.discount_enabled,
              discount_type: it.discount_type,
              discount_value: it.discount_value,
            }
          }
        }
        return next
      })
      setItems((prev) =>
        prev.map((it) =>
          recalculateItemTotal({
            ...it,
            discount_enabled: false,
            discount_type: 'none',
            discount_value: 0,
          }),
        ),
      )
    }
    if (discountMode === 'individual') {
      setItems((prev) =>
        prev.map((it) => {
          const backup = individualDiscountBackup[it.id]
          if (!backup) return it
          return recalculateItemTotal({
            ...it,
            discount_enabled: backup.discount_enabled,
            discount_type: backup.discount_type,
            discount_value: backup.discount_value,
          })
        }),
      )
    }
  }, [discountMode])

  useEffect(() => {
    if (vendorLoading) return

    if (!activeVendorId && !isGrandUserAllShops) {
      setReceipts([])
      setTemplates([])
      setProducts([])
      setLoading(false)
      return
    }

    loadData(activeVendorId ?? null)
  }, [vendorLoading, activeVendorId, role])

  const loadData = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const vendorFilter = vendorId ?? undefined

      // Fast path: load receipts first so the page becomes usable quickly.
      const receiptsData = await receiptService.getAllReceipts(vendorFilter)
      setReceipts(receiptsData)
      setLoading(false)

      // Background: templates/products are needed mainly for names + create modal.
      void (async () => {
        try {
          const [templatesData, productsData] = await Promise.all([
            templateService.getAllTemplates(vendorFilter),
            productService.getAllProducts(vendorFilter),
          ])
          setTemplates(templatesData)
          setProducts(productsData)
        } catch (bgErr) {
          console.warn('Background load failed:', bgErr)
        }
      })()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      showToast('Failed to load receipts', errorMessage, 'error')
      setReceipts([])
      setTemplates([])
      setProducts([])
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
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0

    // Default behavior (desc): newest receipts first.
    if (sortDirection === 'desc') {
      const createdDelta = bCreated - aCreated
      if (createdDelta !== 0) return createdDelta
      const aTotal = a.total ?? 0
      const bTotal = b.total ?? 0
      return bTotal - aTotal
    }

    // Ascending sort: primarily by total amount, tie-breaker by newest first.
    const aTotal = a.total ?? 0
    const bTotal = b.total ?? 0
    const totalDelta = aTotal - bTotal
    if (totalDelta !== 0) return totalDelta
    return bCreated - aCreated
  })

  const totalReceipts = sortedReceipts.length
  const totalPages = Math.max(1, Math.ceil(totalReceipts / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedReceipts = sortedReceipts.slice(startIndex, startIndex + rowsPerPage)

  const handleAddNew = () => {
    // Require a vendor selection before creating receipts
    if (!activeVendorId) {
      const message = 'Please select a shop from the header before creating receipts.'
      setError(message)
      showToast('Missing shop', message, 'error')
      return
    }

    if (isPausedVendor) {
      const message = 'Shop is not found. Please contact to the author.'
      setError(message)
      showToast('Shop unavailable', message, 'error')
      return
    }

    setSelectedReceipt(null)
    setCompanyInfoEdited(false)
    setFooterNotesEdited(false)
    setFormData({
      company_name: activeVendorName,
      company_logo: '',
      company_email: '',
      company_phone: '',
      company_address: '',
      company_city: '',
      company_zip: '',
      company_website: '',
      company_tax_id: '',
      customer_name: '',
      customer_email: '',
      customer_company: '',
      customer_phone: '',
      customer_address: '',
      template_id: '',
      tax_percent: '0',
      discount_type: 'none',
      discount_value: '0',
      notes: '',
      footer_message: '',
    })
    setItems([])
    setSelectedProductId('')
    setItemQuantity('1')
    setShowForm(true)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (loading || vendorLoading) return

    const quickCreate = window.localStorage.getItem('xreceipt.quickCreate')
    if (quickCreate !== 'receipt') return

    window.localStorage.removeItem('xreceipt.quickCreate')
    handleAddNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, vendorLoading, activeVendorId])

  const handleEdit = async (receipt: Receipt) => {
    try {
      // Fetch the full receipt with items
      const fullReceipt = await receiptService.getReceiptById(receipt.id)
      if (!fullReceipt) {
        setError('Receipt not found')
        showToast('Receipt not found', 'The selected receipt could not be loaded.', 'error')
        return
      }
      
      setSelectedReceipt(fullReceipt)
      const vendorNameForReceipt = fullReceipt.vendor_id
        ? vendors.find((v) => v.id === fullReceipt.vendor_id)?.name || ''
        : ''
      setCompanyInfoEdited(true) // Mark as edited since we're loading existing receipt data
      setFooterNotesEdited(true) // Mark as edited since we're loading existing receipt data
      setFormData({
        company_name: fullReceipt.company_name || vendorNameForReceipt,
        company_logo: (fullReceipt as any).company_logo || '',
        company_email: (fullReceipt as any).company_email || '',
        company_phone: (fullReceipt as any).company_phone || '',
        company_address: (fullReceipt as any).company_address || '',
        company_city: (fullReceipt as any).company_city || '',
        company_zip: (fullReceipt as any).company_zip || '',
        company_website: (fullReceipt as any).company_website || '',
        company_tax_id: (fullReceipt as any).company_tax_id || '',
        customer_name: fullReceipt.customer_name,
        customer_email: fullReceipt.customer_email,
        customer_company: fullReceipt.customer_company || '',
        customer_phone: fullReceipt.customer_phone || '',
        customer_address: fullReceipt.customer_address || '',
        template_id: fullReceipt.template_id,
        tax_percent:
          typeof (fullReceipt as any).tax_percent === 'number'
            ? String((fullReceipt as any).tax_percent)
            : fullReceipt.subtotal && fullReceipt.subtotal > 0 && fullReceipt.tax
              ? ((fullReceipt.tax / fullReceipt.subtotal) * 100).toFixed(2)
              : '0',
        discount_type:
          (fullReceipt as any).discount_type
            ? ((fullReceipt as any).discount_type as 'none' | 'percentage' | 'flat')
            : fullReceipt.discount && fullReceipt.discount > 0
              ? 'flat'
              : 'none',
        discount_value:
          typeof (fullReceipt as any).discount_value === 'number'
            ? String((fullReceipt as any).discount_value)
            : fullReceipt.discount && fullReceipt.discount > 0
              ? String(fullReceipt.discount)
              : '0',
        notes: fullReceipt.notes || '',
        footer_message: fullReceipt.footer_message || '',
      })
      // Load existing items if available
      setItems(fullReceipt.items || [])
      setSelectedProductId('')
      setItemQuantity('1')
      setShowForm(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load receipt'
      setError(message)
      showToast('Failed to load receipt', message, 'error')
    }
  }

  const templatesForReceiptModal = useMemo(() => {
    if (!vendorIdForReceiptModal) return templates
    return templates.filter((tpl: any) => tpl.vendor_id === vendorIdForReceiptModal)
  }, [templates, vendorIdForReceiptModal])

  const productsForReceiptModal = useMemo(() => {
    if (!vendorIdForReceiptModal) return products
    return products.filter((p: any) => p.vendor_id === vendorIdForReceiptModal)
  }, [products, vendorIdForReceiptModal])

  const permissionFilteredProductsForReceiptModal = useMemo(() => {
    return role === 'admin' && !isVendorSuperAdminForActiveVendor && permissions?.can_view_products && assignedProductIds.length > 0
      ? productsForReceiptModal.filter((p) => assignedProductIds.includes(p.id))
      : productsForReceiptModal
  }, [role, isVendorSuperAdminForActiveVendor, permissions, assignedProductIds, productsForReceiptModal])

  useEffect(() => {
    if (!selectedProductId) return
    const product = permissionFilteredProductsForReceiptModal.find((p) => p.id === selectedProductId)
    if (!product) return
    const productImeiOrModel = typeof product.imei_or_model === 'string' ? product.imei_or_model : ''
    const productColor = typeof product.color === 'string' ? product.color : ''
    setItemImeiOrModel(productImeiOrModel)
    setItemColor(productColor)

    const taxEnabled = product.tax_enabled ?? true
    const taxPercentage = String(product.tax_percentage ?? 0)
    const discountEnabled = product.discount_enabled ?? false
    const discountType = discountEnabled
      ? product.discount_type && product.discount_type !== 'none'
        ? product.discount_type
        : 'percentage'
      : 'none'
    const discountValue = String(product.discount_value ?? 0)

    setItemTaxEnabled(taxEnabled)
    setItemTaxPercentage(taxPercentage)
    setItemDiscountEnabled(discountEnabled)
    setItemDiscountType(discountType as 'none' | 'percentage' | 'flat')
    setItemDiscountValue(discountValue)
  }, [selectedProductId, permissionFilteredProductsForReceiptModal])

  useEffect(() => {
    if (!showForm) {
      setModalTemplates([])
      return
    }

    if (!vendorIdForReceiptModal) {
      setModalTemplates([])
      return
    }

    // Provide an immediate filtered fallback while we fetch the authoritative list
    // (includes templates assigned via receipt_template_vendors).
    setModalTemplates(templatesForReceiptModal)

    templateService
      .getAllTemplates(vendorIdForReceiptModal)
      .then((rows) => {
        setModalTemplates(rows)
      })
      .catch(() => {
        // Keep fallback
      })
  }, [showForm, vendorIdForReceiptModal])

  // Handle template selection change - prefill company info from template
  useEffect(() => {
    if (!showForm || !formData.template_id) return

    const selectedTemplate = modalTemplates.find((t) => t.id === formData.template_id)
    if (!selectedTemplate?.template_html) return

    // Prefill footer message and notes from template data for new receipts,
    // but don't overwrite user edits.
    if (!footerNotesEdited) {
      setFormData((prev) => ({
        ...prev,
        footer_message: selectedTemplate.footer_message || prev.footer_message,
        notes: selectedTemplate.footer_notes || prev.notes,
      }))
    }

    // Only prefill if user hasn't manually edited company info
    if (companyInfoEdited) return

    const builderData = extractBuilderData(selectedTemplate.template_html)
    if (!builderData) return

    // Prefill company info from template data
    setFormData((prev) => ({
      ...prev,
      company_name: builderData.companyName || prev.company_name || activeVendorName,
      company_logo: builderData.companyLogo || prev.company_logo,
      company_email: builderData.companyEmail || prev.company_email,
      company_phone: builderData.companyPhone || prev.company_phone,
      company_address: builderData.companyAddress || prev.company_address,
      company_city: builderData.companyCity || prev.company_city,
      company_zip: builderData.companyZip || prev.company_zip,
      company_website: builderData.companyWebsite || prev.company_website,
      company_tax_id: builderData.companyTaxId || prev.company_tax_id,
    }))
  }, [formData.template_id, modalTemplates, showForm, companyInfoEdited, footerNotesEdited, activeVendorName])

  const addItem = () => {
    if (!selectedProductId || !itemQuantity) return

    const product = permissionFilteredProductsForReceiptModal.find(p => p.id === selectedProductId)
    if (!product) return

    const quantity = Math.max(1, Math.trunc(safeNumber(itemQuantity)))

    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(7),
      product_id: product.id,
      name: product.name,
      imei_or_model: itemImeiOrModel.trim() ? itemImeiOrModel.trim() : null,
      color: itemColor.trim() ? itemColor.trim() : null,
      quantity,
      unit_price: product.price,
      tax_enabled: itemTaxEnabled,
      tax_percentage: clampPercent(itemTaxPercentage),
      discount_enabled: itemDiscountEnabled,
      discount_type: itemDiscountEnabled ? (itemDiscountType === 'none' ? 'percentage' : itemDiscountType) : 'none',
      discount_value:
        itemDiscountEnabled
          ? (itemDiscountType === 'none' ? 'percentage' : itemDiscountType) === 'percentage'
            ? clampPercent(itemDiscountValue)
            : (itemDiscountType === 'none' ? 'percentage' : itemDiscountType) === 'flat'
              ? Math.min(product.price, Math.max(0, Math.floor(safeNumber(itemDiscountValue))))
              : 0
          : 0,
      total: 0,
    }

    setItems([...items, recalculateItemTotal(newItem)])
    setSelectedProductId('')
    setItemQuantity('1')
    setItemImeiOrModel('')
    setItemColor('')
    setItemTaxEnabled(true)
    setItemTaxPercentage('0')
    setItemDiscountEnabled(false)
    setItemDiscountType('none')
    setItemDiscountValue('0')
  }

  const handleQuickCreateProduct = async () => {
    const vendorId = activeVendorId || vendorIdForReceiptModal
    if (!vendorId) {
      setQuickProductError('Please select a shop from the header before creating products.')
      return
    }

    if (isPausedVendor) {
      setQuickProductError('Shop is not found. Please contact to the author.')
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

      const safeTaxPercentage = clampPercent(quickProductTaxPercentage)

      const discountValueRaw = safeNumber(quickProductDiscountValue)
      const safeDiscountValue =
        quickProductDiscountType === 'percentage'
          ? clampPercent(discountValueRaw)
          : quickProductDiscountType === 'flat'
            ? Math.min(price, Math.max(0, Math.floor(discountValueRaw)))
            : 0

      const productData: any = {
        name: quickProductName.trim(),
        description: quickProductDescription.trim() || null,
        imei_or_model: quickProductImeiOrModel.trim() ? quickProductImeiOrModel.trim() : null,
        color: quickProductColor.trim() ? quickProductColor.trim() : null,
        price,
        category_id: null,
        vendor_id: vendorId,
        tax_enabled: !!quickProductTaxEnabled,
        tax_percentage: safeTaxPercentage,
        discount_enabled: !!quickProductDiscountEnabled,
        discount_type: quickProductDiscountEnabled ? quickProductDiscountType : 'none',
        discount_value: quickProductDiscountEnabled ? safeDiscountValue : 0,
      }

      const newProduct = await productService.createProduct(productData)
      setProducts((prev) => [newProduct, ...prev])
      setSelectedProductId(newProduct.id)
      setShowQuickProductForm(false)
      setQuickProductName('')
      setQuickProductPrice('')
      setQuickProductDescription('')
      setQuickProductImeiOrModel('')
      setQuickProductColor('')
      setQuickProductTaxEnabled(true)
      setQuickProductTaxPercentage('0')
      setQuickProductDiscountEnabled(false)
      setQuickProductDiscountType('none')
      setQuickProductDiscountValue('0')
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

  const openPreview = async (receipt: Receipt, mode: 'view' | 'download') => {
    try {
      setPreviewLoadingId(receipt.id)
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
    } finally {
      setPreviewLoadingId(null)
    }
  }

  const buildReceiptHtml = (receipt: Receipt, templateHtmlInput: string) => {
    let templateHtml = templateHtmlInput
    const subtotal = receipt.subtotal || 0
    const discount = receipt.discount || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    const getItemTotals = (item: ReceiptItem) => {
      const quantity = Math.max(1, Math.trunc(safeNumber(item.quantity)))
      const unitPrice = Math.max(0, safeNumber(item.unit_price))
      const lineSubtotal = unitPrice * quantity

      const discountEnabled = item.discount_enabled === true
      const discountType = discountEnabled
        ? item.discount_type && item.discount_type !== 'none'
          ? item.discount_type
          : 'percentage'
        : 'none'
      const discountValueRaw = Math.max(0, safeNumber(item.discount_value))
      const discountValue =
        discountType === 'percentage'
          ? clampPercent(discountValueRaw)
          : discountType === 'flat'
            ? Math.min(unitPrice, Math.max(0, Math.floor(discountValueRaw)))
            : 0
      const discountAmountRaw =
        discountType === 'percentage'
          ? lineSubtotal * (discountValue / 100)
          : discountType === 'flat'
            ? discountValue * quantity
            : 0
      const lineDiscount = Math.min(Math.max(0, discountAmountRaw), lineSubtotal)

      const taxEnabled = item.tax_enabled !== false
      const taxPercentage = clampPercent(item.tax_percentage)
      const taxableBase = Math.max(0, lineSubtotal - lineDiscount)
      const lineTax = taxEnabled ? taxableBase * (taxPercentage / 100) : 0

      const lineTotal = taxableBase + lineTax

      return { lineSubtotal, lineDiscount, lineTax, lineTotal, taxEnabled, taxPercentage, discountType, discountValue }
    }

    let itemsSubtotal = 0
    let itemsDiscount = 0
    let itemsTax = 0
    if (receipt.items && receipt.items.length > 0) {
      for (const item of receipt.items) {
        const { lineSubtotal, lineDiscount, lineTax } = getItemTotals(item)
        itemsSubtotal += lineSubtotal
        itemsDiscount += lineDiscount
        itemsTax += lineTax
      }
    }

    const receiptDiscountType = ((receipt as any).discount_type as string | undefined) || 'none'
    const receiptDiscountValueRaw =
      typeof (receipt as any).discount_value === 'number' ? ((receipt as any).discount_value as number) : 0
    const receiptDiscountValue =
      receiptDiscountType === 'percentage'
        ? clampPercent(receiptDiscountValueRaw)
        : receiptDiscountType === 'flat'
          ? Math.max(0, Math.floor(receiptDiscountValueRaw))
          : 0

    const netAfterItemDiscount = Math.max(0, itemsSubtotal - itemsDiscount)
    const receiptDiscountAmountRaw =
      receiptDiscountType === 'percentage'
        ? netAfterItemDiscount * (receiptDiscountValue / 100)
        : receiptDiscountType === 'flat'
          ? receiptDiscountValue
          : 0
    const receiptDiscount = Math.min(Math.max(0, receiptDiscountAmountRaw), netAfterItemDiscount)

    const netAfterAllDiscounts = Math.max(0, netAfterItemDiscount - receiptDiscount)
    const receiptTaxPercent = clampPercent((receipt as any).tax_percent)
    const receiptTax = netAfterAllDiscounts * (receiptTaxPercent / 100)

    const taxPercent =
      typeof (receipt as any).tax_percent === 'number'
        ? ((receipt as any).tax_percent as number)
        : Math.max(0, subtotal - discount) > 0
          ? (tax / Math.max(0, subtotal - discount)) * 100
          : 0
    const safeTaxPercent = Number.isFinite(taxPercent) ? Math.max(0, taxPercent) : 0

    const discountType = receiptDiscountType
    const discountValue = receiptDiscountValue

    const taxMeta = safeTaxPercent > 0 ? `(${safeTaxPercent.toFixed(2)}%)` : ''
    const discountMeta =
      discountType === 'percentage' && discountValue > 0
        ? `(${discountValue.toFixed(2)}%)`
        : discountType === 'flat' && discountValue > 0
          ? `(৳${discountValue.toFixed(2)})`
          : ''

    type ItemCol =
      | 'description'
      | 'imei_or_model'
      | 'color'
      | 'discount'
      | 'tax'
      | 'quantity'
      | 'price'
      | 'total'

    const normalizeItemsColumns = (cols: ItemCol[]): ItemCol[] => {
      if (!cols.length) return cols

      const unique: ItemCol[] = Array.from(new Set(cols)) as ItemCol[]

      const has = (c: ItemCol) => unique.includes(c)
      const extrasBeforeQty: ItemCol[] = []
      if (has('imei_or_model')) extrasBeforeQty.push('imei_or_model')
      if (has('color')) extrasBeforeQty.push('color')

      const normalized: ItemCol[] = []
      if (has('description')) normalized.push('description')
      normalized.push(...extrasBeforeQty)
      if (has('quantity')) normalized.push('quantity')
      if (has('price')) normalized.push('price')
      if (has('tax')) normalized.push('tax')
      if (has('discount')) normalized.push('discount')
      if (has('total')) normalized.push('total')

      for (const c of unique) {
        if (!normalized.includes(c)) normalized.push(c)
      }

      return normalized
    }

    const injectItemsHeaderColumns = (html: string, cols: ItemCol[]) => {
      if (!html) return html
      if (!cols.includes('tax') || !cols.includes('discount')) return html

      const hasTaxHeader = /<th[^>]*>\s*Tax\s*<\/th>/i.test(html)
      const hasDiscountHeader = /<th[^>]*>\s*Discount\s*<\/th>/i.test(html)
      if (hasTaxHeader && hasDiscountHeader) return html

      const theadMatch = html.match(/<thead[^>]*>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/i)
      if (!theadMatch) return html

      const headerRowInner = theadMatch[1]
      const taxTh = '<th class="text-right">Tax</th>'
      const discountTh = '<th class="text-right">Discount</th>'
      let updatedHeaderRowInner = headerRowInner

      const unitPriceThRegex = /(<th[^>]*>[\s\S]*?(Unit\s*Price|Price)[\s\S]*?<\/th>)/i
      const quantityThRegex = /(<th[^>]*>[\s\S]*?(Quantity|Qty)[\s\S]*?<\/th>)/i

      const unitMatch = headerRowInner.match(unitPriceThRegex)
      const qtyMatch = headerRowInner.match(quantityThRegex)

      if (unitMatch) {
        const insertion = `${unitMatch[1]}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
        updatedHeaderRowInner = headerRowInner.replace(unitPriceThRegex, insertion)
      } else if (qtyMatch) {
        const insertion = `${qtyMatch[1]}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
        updatedHeaderRowInner = headerRowInner.replace(quantityThRegex, insertion)
      } else {
        updatedHeaderRowInner = `${headerRowInner}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
      }

      return html.replace(theadMatch[0], theadMatch[0].replace(headerRowInner, updatedHeaderRowInner))
    }

    let itemsColumns: ItemCol[] = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = templateHtml.match(/data-items-columns="([a-z_,]+)"/)
    if (itemsColumnsMatch && itemsColumnsMatch[1]) {
      const parts = itemsColumnsMatch[1].split(',').map(p => p.trim()).filter(Boolean)
      const valid: ItemCol[] = []
      for (const col of parts) {
        if (
          col === 'description' ||
          col === 'imei_or_model' ||
          col === 'color' ||
          col === 'discount' ||
          col === 'tax' ||
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

    if (!itemsColumns.includes('tax')) itemsColumns.push('tax')
    if (!itemsColumns.includes('discount')) itemsColumns.push('discount')

    itemsColumns = normalizeItemsColumns(itemsColumns)
    if (itemsColumnsMatch) {
      templateHtml = templateHtml.replace(itemsColumnsMatch[0], `data-items-columns="${itemsColumns.join(',')}"`)
      templateHtml = injectItemsHeaderColumns(templateHtml, itemsColumns)
    }

    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      const hasDedicatedImeiColumn = itemsColumns.includes('imei_or_model')
      const hasDedicatedColorColumn = itemsColumns.includes('color')

      itemsHTML = receipt.items
        .map((item) => {
          const { lineDiscount, lineTax, lineTotal, taxEnabled, taxPercentage } = getItemTotals(item)

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
                  ? `<div style="margin-top: 2px; font-size: 11px; color: #666; line-height: 1.35;">${metaParts.join('<br/>')}</div>`
                  : ''

                return `<td style="padding: 8px; border-bottom: 1px solid #eee;"><div>${item.name}</div>${metaHtml}</td>`
              }
              if (col === 'imei_or_model') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.imei_or_model || ''}</td>`
              }
              if (col === 'color') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.color || ''}</td>`
              }
              if (col === 'discount') {
                const discountMetaText =
                  item.discount_type === 'percentage' && item.discount_enabled
                    ? `${clampPercent(item.discount_value).toFixed(0)}%`
                    : item.discount_type === 'flat' && item.discount_enabled
                      ? `৳${Math.max(0, Math.floor(item.discount_value || 0)).toFixed(0)} flat`
                      : ''
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
                  ${item.discount_enabled === true ? `<div>-৳${lineDiscount.toFixed(2)}</div>` : '<div></div>'}
                  ${discountMetaText ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${discountMetaText}</div>` : ''}
                </td>`
              }
              if (col === 'tax') {
                const taxMetaText = taxEnabled ? `${taxPercentage.toFixed(0)}%` : ''
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
                  ${taxEnabled ? `<div>+৳${lineTax.toFixed(2)}</div>` : '<div></div>'}
                  ${taxMetaText ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${taxMetaText}</div>` : ''}
                </td>`
              }
              if (col === 'quantity') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>`
              }
              if (col === 'price') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${item.unit_price.toFixed(2)}</td>`
              }
              if (col === 'total') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${lineTotal.toFixed(2)}</td>`
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

    const totalDiscount = itemsDiscount + receiptDiscount
    const totalTax = itemsTax + receiptTax
    const hasTaxableItems = receipt.items && receipt.items.length > 0 && totalTax > 0

    const companyName =
      receipt.company_name ||
      (receipt.vendor_id ? vendors.find((v) => v.id === receipt.vendor_id)?.name : null) ||
      'xReceipt'

    // Get template for fallback values
    const template = receipt.template_id ? templates.find((t) => t.id === receipt.template_id) : null

    // Priority: receipt values > template values > defaults
    const footerMessage = receipt.footer_message || template?.footer_message || 'Thank you for your business!'
    const notes = receipt.notes || template?.footer_notes || ''

    // Build company info HTML blocks
    const toBlock = (content: string) =>
      content ? `<span style="display:block">${content}</span>` : ''

    const companyLogo = (receipt as any).company_logo
      ? toBlock(`<img src="${(receipt as any).company_logo}" alt="Company Logo" class="company-logo" />`)
      : ''
    const companyNameHTML = (receipt as any).company_name || companyName
      ? toBlock(`<span style="font-weight:700">${(receipt as any).company_name || companyName}</span>`)
      : ''
    const companyEmail = (receipt as any).company_email
      ? toBlock(`${(receipt as any).company_email}`)
      : ''
    const companyPhone = (receipt as any).company_phone
      ? toBlock(`${(receipt as any).company_phone}`)
      : ''
    const companyAddress = (receipt as any).company_address
      ? toBlock(`${(receipt as any).company_address}`)
      : ''
    const companyCityZip = ((receipt as any).company_city || (receipt as any).company_zip)
      ? toBlock(`${[(receipt as any).company_city, (receipt as any).company_zip].filter(Boolean).join(' ')}`)
      : ''
    const companyWebsite = (receipt as any).company_website
      ? toBlock(`${(receipt as any).company_website}`)
      : ''
    const companyTaxId = (receipt as any).company_tax_id
      ? toBlock(`${(receipt as any).company_tax_id}`)
      : ''

    const totalTaxHtml = `<span style="color:#059669">৳ ${totalTax.toFixed(2)}</span>`
    const totalDiscountHtml = `<span style="color:#dc2626">৳ ${totalDiscount.toFixed(2)}</span>`

    let html = templateHtml
      .replace(/৳\s*{{TOTAL_TAX}}/g, '{{TOTAL_TAX_COLORED}}')
      .replace(/৳\s*{{TOTAL_DISCOUNT}}/g, '{{TOTAL_DISCOUNT_COLORED}}')
      .replace(/{{RECEIPT_ID}}/g, receipt.receipt_number || receipt.id)
      .replace(/{{DATE}}/g, new Date(receipt.created_at).toLocaleDateString())
      .replace(/{{DUE_DATE}}/g, '')
      .replace(/{{CUSTOMER_NAME}}/g, receipt.customer_name || '')
      .replace(/{{CUSTOMER_EMAIL}}/g, receipt.customer_email || '')
      .replace(/{{CUSTOMER_COMPANY}}/g, receipt.customer_company || '')
      .replace(/{{CUSTOMER_PHONE}}/g, receipt.customer_phone || '')
      .replace(/{{CUSTOMER_ADDRESS}}/g, receipt.customer_address || '')
      .replace(/{{ITEMS}}/g, itemsHTML)
      .replace(/{{TOTAL}}/g, total.toFixed(2))
      .replace(/{{SUBTOTAL}}/g, subtotal.toFixed(2))
      .replace(/{{TAX}}/g, hasTaxableItems ? tax.toFixed(2) : '0.00')
      .replace(/{{TAX_PERCENT}}/g, safeTaxPercent.toFixed(2))
      .replace(/{{TAX_META}}/g, taxMeta)
      .replace(/{{DISCOUNT}}/g, discount.toFixed(2))
      .replace(/{{DISCOUNT_TYPE}}/g, discountType)
      .replace(/{{DISCOUNT_VALUE}}/g, Number.isFinite(discountValue) ? discountValue.toFixed(2) : '0.00')
      .replace(/{{DISCOUNT_META}}/g, discountMeta)
      .replace(/{{ITEMS_DISCOUNT}}/g, itemsDiscount.toFixed(2))
      .replace(/{{RECEIPT_DISCOUNT}}/g, receiptDiscount.toFixed(2))
      .replace(/{{TOTAL_DISCOUNT_COLORED}}/g, totalDiscountHtml)
      .replace(/{{TOTAL_DISCOUNT}}/g, totalDiscountHtml)
      .replace(/{{ITEMS_TAX}}/g, itemsTax.toFixed(2))
      .replace(/{{RECEIPT_TAX}}/g, receiptTax.toFixed(2))
      .replace(/{{TOTAL_TAX_COLORED}}/g, totalTaxHtml)
      .replace(/{{TOTAL_TAX}}/g, totalTaxHtml)
      .replace(/{{STATUS}}/g, receipt.status)
      .replace(/{{COMPANY_LOGO}}/g, companyLogo)
      .replace(/{{COMPANY_NAME}}/g, companyNameHTML)
      .replace(/{{COMPANY_EMAIL}}/g, companyEmail)
      .replace(/{{COMPANY_PHONE}}/g, companyPhone)
      .replace(/{{COMPANY_ADDRESS}}/g, companyAddress)
      .replace(/{{COMPANY_CITY_ZIP}}/g, companyCityZip)
      .replace(/{{COMPANY_WEBSITE}}/g, companyWebsite)
      .replace(/{{COMPANY_TAX_ID}}/g, companyTaxId)
      .replace(/{{FOOTER_MESSAGE}}/g, footerMessage)
      .replace(/{{NOTES}}/g, notes)

    // Some templates include a standalone black currency symbol before the colored tax/discount value.
    // Strip any plain '৳' right before our colored spans so only the colored currency remains.
    // This handles: ৳ <span style="color:...">, ৳<span>, and <span>৳ </span><span color...>
    html = html
      .replace(/(?:<span[^>]*>)?\s*৳\s*(?:<\/span>)?\s*(?=<span[^>]*color:#059669[^>]*>)/gi, '')
      .replace(/(?:<span[^>]*>)?\s*৳\s*(?:<\/span>)?\s*(?=<span[^>]*color:#dc2626[^>]*>)/gi, '')
      // Also handle patterns like: text ৳ <span> or text ৳ <b><span>
      .replace(/\s*৳\s*(?=<[^>]*>.*?<span[^>]*color:#059669)/gi, '')
      .replace(/\s*৳\s*(?=<[^>]*>.*?<span[^>]*color:#dc2626)/gi, '')

    html = html.replace(/<div\s+class="total-row\s+items-total"[\s\S]*?<\/div>/gi, '')

    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^^>]*>/g, '')
    }

    const normalizeReceiptStrip = (raw: string) => {
      const stripMatch = raw.match(/<div\s+class=\"receipt-strip\"[^>]*>[\s\S]*?<\/div>/i)
      if (!stripMatch) return raw

      const stripHtml = stripMatch[0]
      const metaMatch = stripHtml.match(
        /<div\s+class=\"receipt-strip-meta\"[^>]*>([\s\S]*?)<\/div>/i,
      )
      if (!metaMatch) return raw

      const metaHtml = metaMatch[1]
      const metaItems = metaHtml
        .match(/<div\s+class=\"meta-item\"[\s\S]*?<\/div>/gi)
        ?.slice(0, 3)

      if (!metaItems || metaItems.length === 0) return raw

      const toSpan = (divHtml: string) => {
        const inner = divHtml
          .replace(/^<div[^>]*>/i, '')
          .replace(/<\/div>$/i, '')
        return `<span style=\"white-space:nowrap\">${inner}</span>`
      }

      const leftMeta = toSpan(metaItems[0])
      const rightMeta = metaItems.slice(1).map(toSpan).join('<span style="width:16px;display:inline-block"></span>')

      const normalizedStrip = `
<div class=\"receipt-strip\" style=\"display:flex;justify-content:space-between;align-items:center;width:100%\">
  <div style=\"flex:1;text-align:left;white-space:nowrap\">
    <span style=\"font-weight:bold;color:#2563eb;\">RECEIPT</span>
    <span style=\"margin-left:8px;\">${leftMeta}</span>
  </div>
  <div style=\"flex:1;text-align:right;white-space:nowrap\">${rightMeta}</div>
</div>`

      return raw.replace(stripHtml, normalizedStrip)
    }

    html = normalizeReceiptStrip(html)

    const previewCss =
      '<style>html,body{margin:0;padding:0;overflow-x:hidden;overflow-y:auto}.items-table tbody tr:nth-child(even){background-color:#f9fafb}table tbody tr:nth-child(even){background-color:#f9fafb}</style>'

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}${previewCss}`)
    } else {
      html = `${previewCss}${html}`
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
        pdf.save(`receipt-${fullReceipt.receipt_number || fullReceipt.id}.pdf`)
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

    if (isSubmitting) return

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
      setIsSubmitting(true)
      const subtotal = receiptItemTotals.itemsSubtotal
      const discountValue = safeNumber(formData.discount_value)
      const safeDiscountValue = Math.max(0, discountValue)
      const taxPercent = safeNumber(formData.tax_percent)
      const safeTaxPercent = Math.max(0, taxPercent)

      const totalDiscount = receiptItemTotals.totalDiscount
      const totalTax = receiptItemTotals.totalTax
      const totalAmount = receiptItemTotals.total

      const receiptData: any = {
        company_name: formData.company_name || activeVendorName || undefined,
        company_logo: formData.company_logo || undefined,
        company_email: formData.company_email || undefined,
        company_phone: formData.company_phone || undefined,
        company_address: formData.company_address || undefined,
        company_city: formData.company_city || undefined,
        company_zip: formData.company_zip || undefined,
        company_website: formData.company_website || undefined,
        company_tax_id: formData.company_tax_id || undefined,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_company: formData.customer_company || undefined,
        customer_phone: formData.customer_phone || undefined,
        customer_address: formData.customer_address || undefined,
        template_id: formData.template_id,
        subtotal,
        discount: totalDiscount,
        discount_type: formData.discount_type,
        discount_value: safeDiscountValue,
        tax_percent: safeTaxPercent,
        tax: totalTax,
        total: totalAmount,
        notes: formData.notes || undefined,
        footer_message: formData.footer_message || undefined,
        items: items.map((it) => recalculateItemTotal(it)), // Include items in the receipt data
      }

      if (isNew && activeVendorId) {
        receiptData.vendor_id = activeVendorId
      }

      let createdReceipt: Receipt
      if (selectedReceipt) {
        await receiptService.updateReceipt(selectedReceipt.id, receiptData)
        setShowForm(false)
        loadData(activeVendorId)
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
        loadData(activeVendorId)
        showToast('Receipt created', 'The new receipt has been created.', 'success')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save receipt'
      setError(message)
      showToast('Failed to save receipt', message, 'error')
    } finally {
      setIsSubmitting(false)
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
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
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

  const getActiveFiltersCount = () => {
    let count = 0
    if (statusFilter !== 'all') count++
    if (templateFilter !== 'all') count++
    if (dateRangeFilter !== 'all') count++
    if (minAmount || maxAmount) count++
    return count
  }

  const clearAllFilters = () => {
    setStatusFilter('all')
    setTemplateFilter('all')
    setDateRangeFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setSearchTerm('')
  }

  const getFilterLabel = (type: string, value: string) => {
    switch (type) {
      case 'status':
        return value === 'draft' ? 'Draft' : value === 'sent' ? 'Sent' : 'Paid'
      case 'template':
        return templates.find(t => t.id === value)?.name || value
      case 'date':
        return value === 'today' ? 'Today' : value === '7d' ? 'Last 7 days' : 'Last 30 days'
      default:
        return value
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your receipts</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full sm:w-64 border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-10 px-4 rounded-lg border-gray-200 flex items-center gap-2 transition-all',
                    getActiveFiltersCount() > 0
                      ? 'bg-violet-50 border-violet-200 text-violet-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Funnel className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-semibold rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[320px] rounded-xl border border-gray-200 bg-white shadow-xl p-4 mr-2 mt-2 z-50 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: 'all', label: 'All' }, { id: 'draft', label: 'Draft' }, { id: 'sent', label: 'Sent' }, { id: 'paid', label: 'Paid' }].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setStatusFilter(option.id as 'all' | 'draft' | 'sent' | 'paid')}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            statusFilter === option.id
                              ? 'bg-violet-100 text-violet-700 border-violet-300 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Template</p>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setTemplateFilter('all')}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          templateFilter === 'all'
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-gray-600 hover:bg-gray-50'
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
                            'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            templateFilter === template.id
                              ? 'bg-violet-50 text-violet-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Range</p>
                    <div className="flex flex-wrap gap-2">
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
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            dateRangeFilter === option.id
                              ? 'bg-violet-100 text-violet-700 border-violet-300 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount Range</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        placeholder="Min"
                        className="h-9 w-24 text-xs border-gray-200 rounded-lg"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="Max"
                        className="h-9 w-24 text-xs border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {getActiveFiltersCount()} active {getActiveFiltersCount() === 1 ? 'filter' : 'filters'}
                    </span>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Add Button */}
            {canCreateReceipts && (
              <span
                title={isGrandUserAllShops ? 'Select a shop first' : isPausedVendor ? 'Shop is inactive' : undefined}
                className="inline-flex"
              >
                <Button
                  onClick={handleAddNew}
                  size="sm"
                  disabled={isGrandUserAllShops || isPausedVendor}
                  className="h-10 rounded-lg"
                >
                  <Plus size={16} className="mr-1" />
                  New Receipt
                </Button>
              </span>
            )}
          </div>
        </div>

        {/* Active Filter Pills */}
        {(statusFilter !== 'all' || templateFilter !== 'all' || dateRangeFilter !== 'all' || minAmount || maxAmount || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 mr-1">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-gray-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Status: {getFilterLabel('status', statusFilter)}
                <button onClick={() => setStatusFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {templateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Template: {getFilterLabel('template', templateFilter)}
                <button onClick={() => setTemplateFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {dateRangeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Date: {getFilterLabel('date', dateRangeFilter)}
                <button onClick={() => setDateRangeFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {(minAmount || maxAmount) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Amount: {minAmount || '0'} - {maxAmount || '∞'}
                <button onClick={() => { setMinAmount(''); setMaxAmount('') }} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
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
          <DialogContent
            className="max-w-2xl lg:max-w-4xl max-h-[calc(100dvh-2rem)] p-0 flex flex-col overflow-hidden min-h-0"
            showCloseButton={false}
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
              <DialogHeader className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    {selectedReceipt ? 'Edit Receipt' : 'New Receipt'}
                  </DialogTitle>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-gray-50/40 space-y-6 min-h-0">
                {/* Template Selection Section - First */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <FileText size={16} className="text-violet-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Receipt Template</h3>
                  </div>
                  <div>
                    <Label htmlFor="template" className="text-sm font-medium text-gray-700" required>Select Template</Label>
                    {(() => {
                      const templatesToShow = vendorIdForReceiptModal ? modalTemplates : templatesForReceiptModal

                      return (
                        <Select.Root
                          value={formData.template_id}
                          onValueChange={(value) => {
                            setFormData((prev) => ({ ...prev, template_id: value }))
                            // Reset flags when changing template for new receipts only
                            if (!selectedReceipt) {
                              setCompanyInfoEdited(false)
                              setFooterNotesEdited(false)
                            }
                          }}
                        >
                          <Select.Trigger
                            id="template"
                            className="w-full mt-1 px-3 py-2 border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 flex items-center justify-between"
                            aria-required
                          >
                            <Select.Value placeholder="Select a template" />
                            <Select.Icon>
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content
                              position="popper"
                              sideOffset={6}
                              className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                              style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                            >
                              <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                                {templatesToShow.map((template: any) => (
                                  <Select.Item
                                    key={template.id}
                                    value={template.id}
                                    className="px-3 py-2 text-sm text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                  >
                                    <Select.ItemText>{template.name}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      )
                    })()}
                  </div>
                </div>

                {/* My Company Information Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Building2 size={16} className="text-violet-600" />
                    <h3 className="text-sm font-semibold text-gray-900">My Company Information</h3>
                  </div>

                  {/* Company Logo */}
                  <div>
                    <Label htmlFor="company_logo" className="text-sm font-medium text-gray-700">Company Logo</Label>
                    <div className="mt-1 flex items-center gap-3">
                      {formData.company_logo && (
                        <img
                          src={formData.company_logo}
                          alt="Company Logo"
                          className="h-16 w-16 object-contain rounded-md border border-gray-200"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="company_logo"
                          type="text"
                          value={formData.company_logo}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, company_logo: e.target.value }))
                            setCompanyInfoEdited(true)
                          }}
                          placeholder="https://example.com/logo.png or upload below"
                          className="border border-gray-200 bg-white focus:border-violet-500"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = () => {
                              const result = reader.result
                              if (typeof result === 'string') {
                                setFormData((prev) => ({ ...prev, company_logo: result }))
                                setCompanyInfoEdited(true)
                              }
                            }
                            reader.readAsDataURL(file)
                          }}
                          className="mt-2 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">Company Name</Label>
                      <Input
                        id="company_name"
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder={activeVendorName || 'Company name on receipt'}
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_email" className="text-sm font-medium text-gray-700">Email</Label>
                      <Input
                        id="company_email"
                        type="email"
                        value={formData.company_email}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_email: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="company@example.com"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="company_phone" className="text-sm font-medium text-gray-700">Phone</Label>
                      <Input
                        id="company_phone"
                        type="tel"
                        value={formData.company_phone}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_phone: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_tax_id" className="text-sm font-medium text-gray-700">Tax ID</Label>
                      <Input
                        id="company_tax_id"
                        type="text"
                        value={formData.company_tax_id}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_tax_id: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="Tax ID / VAT Number"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company_address" className="text-sm font-medium text-gray-700">Address</Label>
                    <Input
                      id="company_address"
                      type="text"
                      value={formData.company_address}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, company_address: e.target.value }))
                        setCompanyInfoEdited(true)
                      }}
                      placeholder="Street address"
                      className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="company_city" className="text-sm font-medium text-gray-700">City</Label>
                      <Input
                        id="company_city"
                        type="text"
                        value={formData.company_city}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_city: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="City"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_zip" className="text-sm font-medium text-gray-700">ZIP / Postal</Label>
                      <Input
                        id="company_zip"
                        type="text"
                        value={formData.company_zip}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_zip: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="ZIP Code"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_website" className="text-sm font-medium text-gray-700">Website</Label>
                      <Input
                        id="company_website"
                        type="text"
                        value={formData.company_website}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, company_website: e.target.value }))
                          setCompanyInfoEdited(true)
                        }}
                        placeholder="www.example.com"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Info Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User size={16} className="text-violet-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Customer Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700" required>Customer Name</Label>
                    <Input
                      id="customer_name"
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="John Doe"
                      required
                      className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customer_email" className="text-sm font-medium text-gray-700" required>Email Address</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, customer_email: e.target.value }))}
                        placeholder="john@example.com"
                        required
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customer_phone" className="text-sm font-medium text-gray-700">Phone</Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, customer_phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customer_company" className="text-sm font-medium text-gray-700">Company</Label>
                    <Input
                      id="customer_company"
                      type="text"
                      value={formData.customer_company}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customer_company: e.target.value }))}
                      placeholder="Client company name"
                      className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer_address" className="text-sm font-medium text-gray-700">Address</Label>
                    <Input
                      id="customer_address"
                      type="text"
                      value={formData.customer_address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customer_address: e.target.value }))}
                      placeholder="Street, City, ZIP"
                      className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                    />
                  </div>
                </div>

              {/* Add Products Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Package size={16} className="text-violet-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Products</h3>
                  {items.length > 0 && (
                    <span className="ml-auto text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                      {items.length} {items.length === 1 ? 'product' : 'products'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Tax mode</span>
                      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button
                          type="button"
                          onClick={() => setTaxMode('individual')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors',
                            taxMode === 'individual'
                              ? 'bg-white text-violet-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900',
                          )}
                        >
                          Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxMode('collective')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors',
                            taxMode === 'collective'
                              ? 'bg-white text-violet-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900',
                          )}
                        >
                          Collective
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {taxMode === 'individual'
                        ? 'Tax is set per product item.'
                        : 'Tax is applied only from the summary section.'}
                    </p>
                  </div>

                  <div className="col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Discount mode</span>
                      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button
                          type="button"
                          onClick={() => setDiscountMode('individual')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors',
                            discountMode === 'individual'
                              ? 'bg-white text-violet-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900',
                          )}
                        >
                          Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode('collective')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors',
                            discountMode === 'collective'
                              ? 'bg-white text-violet-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900',
                          )}
                        >
                          Collective
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {discountMode === 'individual'
                        ? 'Discount is set per product item.'
                        : 'Discount is applied only from the summary section.'}
                    </p>
                  </div>
                </div>

                {/* Items Table Header */}
                {items.length > 0 && (
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase">Product</div>
                    <div className="col-span-1 text-xs font-semibold text-gray-600 uppercase">Qty</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Discount</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Tax</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Amount</div>
                    <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase text-right">Action</div>
                  </div>
                )}

                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const { lineSubtotal, lineDiscount, lineTax, lineTotal } = getItemBreakdown(item)
                      const discountEnabled = discountMode === 'individual' && item.discount_enabled === true
                      const discountType = discountEnabled
                        ? item.discount_type && item.discount_type !== 'none'
                          ? item.discount_type
                          : 'percentage'
                        : 'none'
                      const unitPrice = Math.max(0, safeNumber(item.unit_price))
                      const discountValueRaw = Math.max(0, safeNumber(item.discount_value))
                      const discountValue =
                        discountType === 'percentage'
                          ? clampPercent(discountValueRaw)
                          : discountType === 'flat'
                            ? Math.min(unitPrice, Math.max(0, Math.floor(discountValueRaw)))
                            : 0
                      const discountLabel =
                        discountType === 'percentage'
                          ? `${clampPercent(discountValue).toFixed(2)}%`
                          : discountType === 'flat'
                            ? `৳${Math.max(0, Math.floor(discountValue)).toFixed(0)}/unit`
                            : ''

                      const taxEnabled = taxMode === 'individual' && item.tax_enabled !== false
                      const taxPercent = clampPercent(item.tax_percentage)

                      const isEditing = editingItemId === item.id

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-3 items-start px-3 py-2.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <div className="col-span-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-600">৳{item.unit_price.toFixed(2)} each</p>
                            </div>
                          </div>

                          <div className="col-span-1">
                            <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
                          </div>

                          <div className="col-span-2 text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {discountEnabled ? `-৳${lineDiscount.toFixed(2)}` : '-'}
                            </p>
                            {discountEnabled && discountLabel ? (
                              <p className="text-xs text-gray-600">{discountLabel}</p>
                            ) : null}
                          </div>

                          <div className="col-span-2 text-right">
                            {taxEnabled ? (
                              <>
                                <p className="text-sm font-medium text-gray-900">+৳{lineTax.toFixed(2)}</p>
                                <p className="text-xs text-gray-600">{taxPercent.toFixed(2)}%</p>
                              </>
                            ) : (
                              <p className="text-sm font-medium text-gray-400">-</p>
                            )}
                          </div>

                          <div className="col-span-2 text-right">
                            <p className="text-xs text-gray-600">৳{lineSubtotal.toFixed(2)}</p>
                            <p className="text-sm font-semibold text-gray-900">৳{lineTotal.toFixed(2)}</p>
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItemId((prev) => (prev === item.id ? null : item.id))}
                                className="p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-md transition-colors cursor-pointer"
                                title={isEditing ? 'Done' : 'Edit item'}
                              >
                                {isEditing ? <Check size={16} /> : <Edit size={16} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="col-span-12">
                            {(item.imei_or_model || item.color) && (
                              <div className="flex flex-wrap gap-2">
                                {item.imei_or_model && (
                                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 border border-gray-200">
                                    IMEI/Model: {item.imei_or_model}
                                  </span>
                                )}
                                {item.color && (
                                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 border border-gray-200">
                                    Color: {item.color}
                                  </span>
                                )}
                              </div>
                            )}

                            {isEditing && (
                              <div className="mt-2 space-y-2">
                                <div className="grid grid-cols-12 gap-2">
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
                                    className="col-span-12 sm:col-span-6 h-8 bg-white text-xs"
                                  />
                                  <Input
                                    type="text"
                                    value={item.color || ''}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      setItems((prev) =>
                                        prev.map((it) => (it.id === item.id ? { ...it, color: value || null } : it)),
                                      )
                                    }}
                                    placeholder="Color"
                                    className="col-span-12 sm:col-span-6 h-8 bg-white text-xs"
                                  />
                                </div>

                                <div className={cn('grid grid-cols-12 gap-2 items-center', taxMode !== 'individual' ? 'opacity-50 pointer-events-none' : undefined)}>
                                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                                    <Checkbox
                                      checked={item.tax_enabled !== false}
                                      onCheckedChange={(checked) => {
                                        const enabled = checked === true
                                        setItems((prev) =>
                                          prev.map((it) =>
                                            it.id === item.id
                                              ? recalculateItemTotal({
                                                  ...it,
                                                  tax_enabled: enabled,
                                                  tax_percentage: enabled ? (it.tax_percentage ?? 0) : 0,
                                                })
                                              : it,
                                          ),
                                        )
                                      }}
                                      id={`item_tax_enabled_${item.id}`}
                                    />
                                    <Label htmlFor={`item_tax_enabled_${item.id}`} className="text-xs font-medium text-gray-700">
                                      Tax
                                    </Label>
                                  </div>
                                  <div className="col-span-12 sm:col-span-8">
                                    <div className="relative inline-block">
                                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                                        %
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={String(item.tax_percentage ?? 0)}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          setItems((prev) =>
                                            prev.map((it) =>
                                              it.id === item.id
                                                ? recalculateItemTotal({
                                                    ...it,
                                                    tax_percentage: clampPercent(value),
                                                  })
                                                : it,
                                            ),
                                          )
                                        }}
                                        disabled={item.tax_enabled === false}
                                        className="h-8 w-24 bg-white text-xs pl-5"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className={cn('grid grid-cols-12 gap-2 items-center', discountMode !== 'individual' ? 'opacity-50 pointer-events-none' : undefined)}>
                                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                                    <Checkbox
                                      checked={item.discount_enabled === true}
                                      onCheckedChange={(checked) => {
                                        const enabled = checked === true
                                        setItems((prev) =>
                                          prev.map((it) =>
                                            it.id === item.id
                                              ? recalculateItemTotal({
                                                  ...it,
                                                  discount_enabled: enabled,
                                                  discount_type: enabled
                                                    ? it.discount_type && it.discount_type !== 'none'
                                                      ? it.discount_type
                                                      : 'percentage'
                                                    : 'none',
                                                  discount_value: enabled ? (it.discount_value ?? 0) : 0,
                                                })
                                              : it,
                                          ),
                                        )
                                      }}
                                      id={`item_discount_enabled_${item.id}`}
                                    />
                                    <Label
                                      htmlFor={`item_discount_enabled_${item.id}`}
                                      className="text-xs font-medium text-gray-700"
                                    >
                                      Discount
                                    </Label>
                                  </div>
                                  <div className="col-span-12 sm:col-span-8">
                                    <div className="grid grid-cols-12 gap-2">
                                      <div className="col-span-7">
                                        <Select.Root
                                          value={
                                            item.discount_enabled
                                              ? item.discount_type && item.discount_type !== 'none'
                                                ? item.discount_type
                                                : 'percentage'
                                              : 'percentage'
                                          }
                                          onValueChange={(value) => {
                                            const unitPrice = Math.max(0, safeNumber(item.unit_price))
                                            const currentValueRaw = safeNumber(item.discount_value)
                                            const nextType = value as 'percentage' | 'flat'
                                            const nextValue =
                                              nextType === 'percentage'
                                                ? clampPercent(currentValueRaw)
                                                : Math.min(unitPrice, Math.max(0, Math.floor(currentValueRaw)))

                                            setItems((prev) =>
                                              prev.map((it) =>
                                                it.id === item.id
                                                  ? recalculateItemTotal({
                                                      ...it,
                                                      discount_type: nextType,
                                                      discount_value: nextValue,
                                                    })
                                                  : it,
                                              ),
                                            )
                                          }}
                                          disabled={!item.discount_enabled}
                                        >
                                          <Select.Trigger className="w-full h-8 px-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs text-gray-900 flex items-center justify-between disabled:bg-gray-50 disabled:opacity-50">
                                            <Select.Value placeholder="Type" />
                                            <Select.Icon>
                                              <ChevronDown className="h-3 w-3 text-gray-500" />
                                            </Select.Icon>
                                          </Select.Trigger>
                                          <Select.Portal>
                                            <Select.Content
                                              position="popper"
                                              sideOffset={6}
                                              className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                                              style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                                            >
                                              <Select.Viewport className="py-1">
                                                <Select.Item
                                                  value="percentage"
                                                  className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700 outline-none"
                                                >
                                                  <Select.ItemText>%</Select.ItemText>
                                                </Select.Item>
                                                <Select.Item
                                                  value="flat"
                                                  className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700 outline-none"
                                                >
                                                  <Select.ItemText>Flat</Select.ItemText>
                                                </Select.Item>
                                              </Select.Viewport>
                                            </Select.Content>
                                          </Select.Portal>
                                        </Select.Root>
                                      </div>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={discountType === 'percentage' ? 100 : Math.max(0, item.unit_price)}
                                        step={discountType === 'flat' ? 1 : 0.01}
                                        value={String(item.discount_value ?? 0)}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          const unitPrice = Math.max(0, safeNumber(item.unit_price))
                                          const nextValueRaw = safeNumber(value)
                                          const nextValue =
                                            discountType === 'percentage'
                                              ? clampPercent(nextValueRaw)
                                              : discountType === 'flat'
                                                ? Math.min(unitPrice, Math.max(0, Math.floor(nextValueRaw)))
                                                : 0
                                          setItems((prev) =>
                                            prev.map((it) =>
                                              it.id === item.id
                                                ? recalculateItemTotal({
                                                    ...it,
                                                    discount_value: nextValue,
                                                  })
                                                : it,
                                            ),
                                          )
                                        }}
                                        disabled={!item.discount_enabled}
                                        className="col-span-5 h-8 bg-white text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add Item Row */}
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <Select.Root value={selectedProductId} onValueChange={(value) => setSelectedProductId(value)}>
                        <Select.Trigger className="w-full h-9 px-3 border-0 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 flex items-center justify-between">
                          <Select.Value placeholder="Select product" />
                          <Select.Icon>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={6}
                            className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                            style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                          >
                            <Select.Viewport className="py-1 max-h-60 overflow-y-auto">
                              {permissionFilteredProductsForReceiptModal.map((product) => (
                                <Select.Item
                                  key={product.id}
                                  value={product.id}
                                  className="px-3 py-2 text-sm text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                >
                                  <Select.ItemText>
                                    {product.name} - ৳{product.price.toFixed(2)}
                                  </Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
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
                    <div className={cn('col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2', taxMode !== 'individual' ? 'opacity-50 pointer-events-none' : undefined)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={itemTaxEnabled}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true
                              setItemTaxEnabled(enabled)
                              if (!enabled) setItemTaxPercentage('0')
                            }}
                            id="add_item_tax_enabled"
                          />
                          <Label htmlFor="add_item_tax_enabled" className="text-xs font-medium text-gray-700">
                            Tax
                          </Label>
                        </div>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                            %
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={itemTaxPercentage}
                            onChange={(e) => setItemTaxPercentage(String(clampPercent(e.target.value)))}
                            disabled={!itemTaxEnabled}
                            className="h-8 w-24 text-xs pl-5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={cn('col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2', discountMode !== 'individual' ? 'opacity-50 pointer-events-none' : undefined)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={itemDiscountEnabled}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true
                              setItemDiscountEnabled(enabled)
                              if (!enabled) {
                                setItemDiscountType('none')
                                setItemDiscountValue('0')
                              } else if (itemDiscountType === 'none') {
                                setItemDiscountType('percentage')
                              }
                            }}
                            id="add_item_discount_enabled"
                          />
                          <Label htmlFor="add_item_discount_enabled" className="text-xs font-medium text-gray-700">
                            Discount
                          </Label>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7">
                            <Select.Root
                              value={itemDiscountType}
                              onValueChange={(value) => setItemDiscountType(value as 'none' | 'percentage' | 'flat')}
                              disabled={!itemDiscountEnabled}
                            >
                              <Select.Trigger className="w-full h-8 px-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 flex items-center justify-between disabled:bg-gray-50 disabled:opacity-50">
                                <Select.Value placeholder="Type" />
                                <Select.Icon>
                                  <ChevronDown className="h-3 w-3 text-gray-500" />
                                </Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content
                                  position="popper"
                                  sideOffset={6}
                                  className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                                  style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                                >
                                  <Select.Viewport className="py-1">
                                    <Select.Item
                                      value="percentage"
                                      className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                    >
                                      <Select.ItemText>%</Select.ItemText>
                                    </Select.Item>
                                    <Select.Item
                                      value="flat"
                                      className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                    >
                                      <Select.ItemText>Flat</Select.ItemText>
                                    </Select.Item>
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={itemDiscountType === 'percentage' ? 100 : undefined}
                            step={itemDiscountType === 'flat' ? 1 : 0.01}
                            value={itemDiscountValue}
                            onChange={(e) => {
                              const raw = safeNumber(e.target.value)
                              if (itemDiscountType === 'percentage') {
                                setItemDiscountValue(String(clampPercent(raw)))
                                return
                              }

                              if (itemDiscountType === 'flat') {
                                const product = permissionFilteredProductsForReceiptModal.find((p) => p.id === selectedProductId)
                                const unitPrice = product ? Math.max(0, safeNumber(product.price)) : Number.POSITIVE_INFINITY
                                setItemDiscountValue(String(Math.min(unitPrice, Math.max(0, Math.floor(raw)))))
                                return
                              }

                              setItemDiscountValue('0')
                            }}
                            disabled={!itemDiscountEnabled}
                            className="col-span-5 h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-8">
                      <Input
                        type="text"
                        value={itemImeiOrModel}
                        onChange={(e) => setItemImeiOrModel(e.target.value)}
                        placeholder="IMEI / Model (optional)"
                        className="border-0 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
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

                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-12 sm:col-span-6">
                              <Input
                                type="text"
                                value={quickProductImeiOrModel}
                                onChange={(e) => setQuickProductImeiOrModel(e.target.value)}
                                placeholder="IMEI / Model (optional)"
                                className="bg-white text-sm"
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-6">
                              <Input
                                type="text"
                                value={quickProductColor}
                                onChange={(e) => setQuickProductColor(e.target.value)}
                                placeholder="Color (optional)"
                                className="bg-white text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={quickProductTaxEnabled}
                                    onCheckedChange={(checked) => {
                                      const enabled = checked === true
                                      setQuickProductTaxEnabled(enabled)
                                      if (!enabled) setQuickProductTaxPercentage('0')
                                    }}
                                    id="quick_product_tax_enabled"
                                  />
                                  <Label htmlFor="quick_product_tax_enabled" className="text-xs font-medium text-gray-700">
                                    Tax
                                  </Label>
                                </div>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={quickProductTaxPercentage}
                                  onChange={(e) => setQuickProductTaxPercentage(String(clampPercent(e.target.value)))}
                                  disabled={!quickProductTaxEnabled}
                                  className="h-8 w-24 text-xs"
                                />
                              </div>
                            </div>

                            <div className="col-span-12 sm:col-span-6 bg-white rounded-md px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={quickProductDiscountEnabled}
                                    onCheckedChange={(checked) => {
                                      const enabled = checked === true
                                      setQuickProductDiscountEnabled(enabled)
                                      if (!enabled) {
                                        setQuickProductDiscountType('none')
                                        setQuickProductDiscountValue('0')
                                      } else if (quickProductDiscountType === 'none') {
                                        setQuickProductDiscountType('percentage')
                                      }
                                    }}
                                    id="quick_product_discount_enabled"
                                  />
                                  <Label htmlFor="quick_product_discount_enabled" className="text-xs font-medium text-gray-700">
                                    Discount
                                  </Label>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-7">
                                    <Select.Root
                                      value={quickProductDiscountType}
                                      onValueChange={(value) =>
                                        setQuickProductDiscountType(value as 'none' | 'percentage' | 'flat')
                                      }
                                      disabled={!quickProductDiscountEnabled}
                                    >
                                      <Select.Trigger className="w-full h-8 px-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 flex items-center justify-between disabled:bg-gray-50 disabled:opacity-50">
                                        <Select.Value placeholder="Type" />
                                        <Select.Icon>
                                          <ChevronDown className="h-3 w-3 text-gray-500" />
                                        </Select.Icon>
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content
                                          position="popper"
                                          sideOffset={6}
                                          className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                                          style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                                        >
                                          <Select.Viewport className="py-1">
                                            <Select.Item
                                              value="percentage"
                                              className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                            >
                                              <Select.ItemText>%</Select.ItemText>
                                            </Select.Item>
                                            <Select.Item
                                              value="flat"
                                              className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                            >
                                              <Select.ItemText>Flat</Select.ItemText>
                                            </Select.Item>
                                          </Select.Viewport>
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </div>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={quickProductDiscountType === 'percentage' ? 100 : undefined}
                                    step={quickProductDiscountType === 'flat' ? 1 : 0.01}
                                    value={quickProductDiscountValue}
                                    onChange={(e) => {
                                      const raw = safeNumber(e.target.value)
                                      if (quickProductDiscountType === 'percentage') {
                                        setQuickProductDiscountValue(String(clampPercent(raw)))
                                        return
                                      }

                                      if (quickProductDiscountType === 'flat') {
                                        const unitPrice = Math.max(0, safeNumber(quickProductPrice))
                                        setQuickProductDiscountValue(String(Math.min(unitPrice, Math.max(0, Math.floor(raw)))))
                                        return
                                      }

                                      setQuickProductDiscountValue('0')
                                    }}
                                    disabled={!quickProductDiscountEnabled}
                                    className="col-span-5 h-8 text-xs"
                                  />
                                </div>
                              </div>
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
                  <div className="bg-blue-50 rounded-md p-3 space-y-2">
                    {(() => {
                      const subtotal = receiptItemTotals.itemsSubtotal
                      const itemDiscount = receiptItemTotals.itemsDiscount
                      const receiptDiscount = receiptItemTotals.receiptDiscount
                      const itemTax = receiptItemTotals.itemsTax
                      const receiptTax = receiptItemTotals.receiptTax
                      const totalDiscount = receiptItemTotals.totalDiscount
                      const totalTax = receiptItemTotals.totalTax
                      const total = receiptItemTotals.total

                      const totalQty = items.reduce((sum, it) => sum + Math.max(1, Math.trunc(safeNumber(it.quantity))), 0)

                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Subtotal</p>
                            <p className="text-sm font-semibold text-gray-900">৳{subtotal.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Item discount</p>
                            <p className="text-sm font-semibold text-gray-900">-৳{itemDiscount.toFixed(2)}</p>
                          </div>

                          <div className="pt-2">
                            <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-white/70 rounded-md">
                              <div className="col-span-5 text-[10px] font-semibold text-gray-600 uppercase">Item</div>
                              <div className="col-span-1 text-[10px] font-semibold text-gray-600 uppercase text-center">Qty</div>
                              <div className="col-span-2 text-[10px] font-semibold text-gray-600 uppercase text-right">Discount</div>
                              <div className="col-span-2 text-[10px] font-semibold text-gray-600 uppercase text-right">Tax</div>
                              <div className="col-span-2 text-[10px] font-semibold text-gray-600 uppercase text-right">Total</div>
                            </div>
                            <div className="mt-1 space-y-1">
                              {items.map((item) => {
                                const { lineDiscount, lineTax, lineTotal } = getItemBreakdown(item)
                                const taxEnabled = taxMode === 'individual' && item.tax_enabled !== false
                                const taxPercent = clampPercent(item.tax_percentage)
                                const discountEnabled = discountMode === 'individual' && item.discount_enabled === true

                                const discountType = discountEnabled
                                  ? item.discount_type && item.discount_type !== 'none'
                                    ? item.discount_type
                                    : 'percentage'
                                  : 'none'
                                const unitPrice = Math.max(0, safeNumber(item.unit_price))
                                const discountValueRaw = Math.max(0, safeNumber(item.discount_value))
                                const discountValue =
                                  discountType === 'percentage'
                                    ? clampPercent(discountValueRaw)
                                    : discountType === 'flat'
                                      ? Math.min(unitPrice, Math.max(0, Math.floor(discountValueRaw)))
                                      : 0
                                const discountMeta =
                                  discountType === 'percentage'
                                    ? `${clampPercent(discountValue).toFixed(2)}%`
                                    : discountType === 'flat'
                                      ? `৳${Math.max(0, Math.floor(discountValue)).toFixed(0)}/unit`
                                      : ''

                                return (
                                  <div key={item.id} className="grid grid-cols-12 gap-2 px-2 py-1 rounded-md">
                                    <div className="col-span-5 min-w-0">
                                      <div className="text-xs text-gray-700 truncate">{item.name}</div>
                                      {(item.imei_or_model || item.color) && (
                                        <div className="text-[10px] text-gray-500 truncate">
                                          {item.imei_or_model ? `IMEI/Model: ${item.imei_or_model}` : ''}
                                          {item.imei_or_model && item.color ? ' · ' : ''}
                                          {item.color ? `Color: ${item.color}` : ''}
                                        </div>
                                      )}
                                    </div>
                                    <div className="col-span-1 text-xs text-gray-700 text-center">{item.quantity}</div>
                                    <div className="col-span-2 text-right">
                                      <div className="text-xs text-gray-700">{discountEnabled ? `-৳${lineDiscount.toFixed(2)}` : '—'}</div>
                                      {discountEnabled && discountMeta ? (
                                        <div className="text-[10px] text-gray-500">{discountMeta}</div>
                                      ) : null}
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <div className="text-xs text-gray-700">{taxEnabled ? `+৳${lineTax.toFixed(2)}` : '—'}</div>
                                      {taxEnabled ? (
                                        <div className="text-[10px] text-gray-500">{taxPercent.toFixed(2)}%</div>
                                      ) : null}
                                    </div>
                                    <div className="col-span-2 text-xs font-semibold text-gray-900 text-right">৳{lineTotal.toFixed(2)}</div>
                                  </div>
                                )
                              })}

                              <div className="grid grid-cols-12 gap-2 px-2 py-1 rounded-md border-t border-white/60 mt-1">
                                <div className="col-span-5 text-xs font-semibold text-gray-900">Totals</div>
                                <div className="col-span-1 text-xs font-semibold text-gray-900 text-center">{totalQty}</div>
                                <div className="col-span-2 text-xs font-semibold text-gray-900 text-right">-৳{itemDiscount.toFixed(2)}</div>
                                <div className="col-span-2 text-xs font-semibold text-gray-900 text-right">+৳{itemTax.toFixed(2)}</div>
                                <div className="col-span-2 text-xs font-semibold text-gray-900 text-right">৳{(Math.max(0, subtotal - itemDiscount) + itemTax).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-blue-200/60 pt-2" />

                          <div className={cn('grid grid-cols-12 gap-2 items-center', discountMode !== 'collective' ? 'opacity-50 pointer-events-none' : undefined)}>
                            <div className="col-span-7">
                              <Label htmlFor="discount_type" className="text-xs font-medium text-gray-700">
                                Discount
                              </Label>
                              <div className="mt-1 grid grid-cols-12 gap-2">
                                <Select.Root
                                  value={formData.discount_type}
                                  onValueChange={(value) =>
                                    setFormData({
                                      ...formData,
                                      discount_type: value as 'none' | 'percentage' | 'flat',
                                    })
                                  }
                                >
                                  <Select.Trigger className="col-span-7 h-8 px-2 border-0 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-900 flex items-center justify-between">
                                    <Select.Value placeholder="None" />
                                    <Select.Icon>
                                      <ChevronDown className="h-3 w-3 text-gray-500" />
                                    </Select.Icon>
                                  </Select.Trigger>
                                  <Select.Portal>
                                    <Select.Content
                                      position="popper"
                                      sideOffset={6}
                                      className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                                      style={{ minWidth: 'var(--radix-select-trigger-width)' }}
                                    >
                                      <Select.Viewport className="py-1">
                                        <Select.Item
                                          value="none"
                                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                        >
                                          <Select.ItemText>None</Select.ItemText>
                                        </Select.Item>
                                        <Select.Item
                                          value="percentage"
                                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                        >
                                          <Select.ItemText>%</Select.ItemText>
                                        </Select.Item>
                                        <Select.Item
                                          value="flat"
                                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 outline-none"
                                        >
                                          <Select.ItemText>Flat</Select.ItemText>
                                        </Select.Item>
                                      </Select.Viewport>
                                    </Select.Content>
                                  </Select.Portal>
                                </Select.Root>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={formData.discount_value}
                                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                  className="col-span-5 h-8 bg-white text-sm"
                                  disabled={formData.discount_type === 'none'}
                                />
                              </div>
                            </div>
                            <div className="col-span-5 text-right">
                              <p className="text-xs text-gray-600">Discount</p>
                              <p className="text-sm font-semibold text-gray-900">-৳{receiptDiscount.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className={cn('grid grid-cols-12 gap-2 items-center', taxMode !== 'collective' ? 'opacity-50 pointer-events-none' : undefined)}>
                            <div className="col-span-7">
                              <Label htmlFor="tax_percent" className="text-xs font-medium text-gray-700">
                                Tax
                              </Label>
                              <div className="relative mt-1">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                                  %
                                </span>
                                <Input
                                  id="tax_percent"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={formData.tax_percent}
                                  onChange={(e) => setFormData({ ...formData, tax_percent: e.target.value })}
                                  className="h-8 bg-white text-sm pl-5"
                                />
                              </div>
                            </div>
                            <div className="col-span-5 text-right">
                              <p className="text-xs text-gray-600">Tax</p>
                              <p className="text-sm font-semibold text-gray-900">৳{receiptTax.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Item tax</p>
                            <p className="text-sm font-semibold text-gray-900">৳{itemTax.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Total discount</p>
                            <p className="text-sm font-semibold text-gray-900">-৳{totalDiscount.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Total tax</p>
                            <p className="text-sm font-semibold text-gray-900">৳{totalTax.toFixed(2)}</p>
                          </div>

                          <div className="border-t border-blue-200 pt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900">Total</p>
                              <p className="text-lg font-bold text-blue-700">৳{total.toFixed(2)}</p>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Empty State */}
                {items.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-md border border-dashed border-gray-200">
                    <p className="text-sm text-gray-600">No products added yet</p>
                    <p className="text-xs text-gray-500 mt-1">Add products below to create receipt</p>
                  </div>
                )}
              </div>

              {/* Notes and Footer Message Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <FileText size={16} className="text-violet-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Notes & Footer</h3>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes / Terms</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      setFooterNotesEdited(true)
                    }}
                    placeholder="Add payment terms, special instructions, or notes..."
                    className="mt-1 w-full px-3 py-2 border border-gray-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm min-h-[80px] resize-y"
                  />
                </div>

                <div>
                  <Label htmlFor="footer_message" className="text-sm font-medium text-gray-700">Footer Message</Label>
                  <Input
                    id="footer_message"
                    type="text"
                    value={formData.footer_message}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, footer_message: e.target.value }))
                      setFooterNotesEdited(true)
                    }}
                    placeholder="Thank you for your business!"
                    className="mt-1 border border-gray-200 bg-white focus:border-violet-500"
                  />
                </div>
              </div>

              </div>

              <DialogFooter className="gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={items.length === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {selectedReceipt ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    (selectedReceipt ? 'Update' : 'Create')
                  )}
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
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedReceipts.map((receipt) => {
              const vendor = receipt.vendor_id ? vendors.find((v) => v.id === receipt.vendor_id) : null
              const templateName = getTemplateName(receipt.template_id)
              const createdAt = new Date(receipt.created_at).toLocaleString()

              return (
                <div
                  key={receipt.id}
                  className="p-4 space-y-3 cursor-pointer"
                  onClick={() => openDetails(receipt)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{receipt.customer_name}</p>
                      <p className="text-xs text-gray-500 truncate">{receipt.customer_email || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span className="font-mono">{getShortReceiptId(receipt)}</span>
                        <span className="text-gray-400">•</span>
                        <span className="truncate max-w-[220px]">{templateName || '—'}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">৳{(receipt.total ?? 0).toFixed(2)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{createdAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {vendor ? (
                        vendor.image_url ? (
                          <img
                            src={vendor.image_url}
                            alt={vendor.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {buildVendorInitials(vendor.name)}
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                      {vendor && <span className="text-xs text-gray-700 truncate">{vendor.name}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openPreview(receipt, 'view')
                        }}
                        disabled={previewLoadingId === receipt.id}
                        title="Preview"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      >
                        {previewLoadingId === receipt.id ? (
                          <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDirectDownload(receipt)
                        }}
                        title="Download PDF"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
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
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
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
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receipt ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Shop</th>
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
                    >
                      {(() => {
                        const vendor = receipt.vendor_id ? vendors.find((v) => v.id === receipt.vendor_id) : null
                        if (!vendor) {
                          return <span className="text-xs text-gray-400">Unassigned</span>
                        }

                        return (
                          <div className="flex items-center gap-2">
                            {vendor.image_url ? (
                              <img
                                src={vendor.image_url}
                                alt={vendor.name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                {buildVendorInitials(vendor.name)}
                              </span>
                            )}
                            <span className="text-sm text-gray-700 truncate max-w-[160px]">{vendor.name}</span>
                          </div>
                        )
                      })()}
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
                        ৳{(receipt.total ?? 0).toFixed(2)}
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
                          disabled={previewLoadingId === receipt.id}
                          title="Preview"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          {previewLoadingId === receipt.id ? (
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
                          ) : (
                            <Eye size={16} />
                          )}
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
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing {totalReceipts === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalReceipts)} of {totalReceipts}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
              <div className="flex items-center gap-2 justify-between sm:justify-start">
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
          <DialogContent className="max-w-sm p-0 flex flex-col">
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

    </div>
  )
}
