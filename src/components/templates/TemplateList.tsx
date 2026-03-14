import { useEffect, useState } from 'react'
import type { ReceiptTemplate, Vendor } from '@/types'
import { templateService } from '@/services/templateService'
import { templateVendorService } from '@/services/templateVendorService'
import { receiptService } from '@/services/receiptService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Plus, Edit, Trash2, AlertCircle, FileCode, Search, Funnel, Eye, ChevronDown, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Select from '@radix-ui/react-select'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Skeleton } from '@/components/ui/Skeleton'

interface TemplateListProps {
  onNavigateToBuilder?: (templateId?: string) => void
}

export default function TemplateList({ onNavigateToBuilder }: TemplateListProps) {
  const { role } = useAuth()
  const { memberships, activeVendorId, activeVendor, loading: vendorLoading } = useVendor()
  const { toast } = useToast()

  const isGrandUserAllShops = role === 'grand_user' && !activeVendorId
  const isPausedVendor = role === 'grand_user' && !!activeVendorId && activeVendor?.status === 'inactive'

  const isVendorSuperAdminForActiveVendor =
    (role === 'admin' || role === 'super_admin') &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const canViewTemplates = role === 'grand_user' || isVendorSuperAdminForActiveVendor
  const canCreateTemplates = role === 'grand_user' || isVendorSuperAdminForActiveVendor
  const isGrandUser = role === 'grand_user'
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<ReceiptTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignSelectedVendorIds, setAssignSelectedVendorIds] = useState<string[]>([])
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [templateVendorAssignments, setTemplateVendorAssignments] = useState<Record<string, string[]>>({})
  const [templateUsageCounts, setTemplateUsageCounts] = useState<Record<string, number>>({})
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<ReceiptTemplate | null>(null)

  const handleNavigateToBuilder = (templateId?: string) => {
    if (isPausedVendor) {
      const message = 'Shop is not found. Please contact to the author.'
      setError(message)
      toast('Shop unavailable', message, 'error')
      return
    }

    onNavigateToBuilder?.(templateId)
  }

  useEffect(() => {
    if (vendorLoading) return

    if (!canViewTemplates) {
      setTemplates([])
      setLoading(false)
      return
    }

    if (!activeVendorId && !isGrandUserAllShops) {
      setTemplates([])
      setLoading(false)
      return
    }

    void loadTemplates(activeVendorId ?? null)
  }, [vendorLoading, activeVendorId, role])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = () => {
      setIsDesktop(mql.matches)
      setAssignTemplateId(null)
      setAssignSelectedVendorIds([])
      setAssignSearch('')
      setAssignError(null)
    }

    handleChange()
    mql.addEventListener('change', handleChange)
    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  const loadTemplates = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const vendorFilter = vendorId ?? undefined
      const data = await templateService.getAllTemplates(vendorFilter)
      setTemplates(data)

      // Do not block the main page render on meta lookups (assignments + usage counts).
      // These can be slow on large datasets.
      const templateIds = data.map((t) => t.id)
      setTemplateVendorAssignments({})
      setTemplateUsageCounts({})

      if (templateIds.length > 0) {
        void (async () => {
          try {
            const assignments = await templateVendorService.getAssignmentsForTemplates(templateIds)
            const map: Record<string, string[]> = {}

            assignments.forEach((row) => {
              if (!map[row.template_id]) {
                map[row.template_id] = []
              }
              if (!map[row.template_id].includes(row.vendor_id)) {
                map[row.template_id].push(row.vendor_id)
              }
            })

            setTemplateVendorAssignments(map)
          } catch (assignErr) {
            console.error('Failed to load template vendor assignments', assignErr)
            setTemplateVendorAssignments({})
          }

          try {
            const counts = await receiptService.getReceiptCountsByTemplateIds(templateIds, vendorId ?? null)
            setTemplateUsageCounts(counts)
          } catch (countErr) {
            console.error('Failed to load template usage counts', countErr)
            setTemplateUsageCounts({})
          }
        })()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates'
      setError(errorMessage)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const term = searchTerm.toLowerCase()
    const nameMatch = template.name.toLowerCase().includes(term)
    const descriptionMatch = template.description
      ? template.description.toLowerCase().includes(term)
      : false

    if (!nameMatch && !descriptionMatch) {
      return false
    }

    const fromJoin = templateVendorAssignments[template.id]
    const baseVendorIds =
      fromJoin && fromJoin.length > 0
        ? fromJoin
        : template.vendor_id
        ? [template.vendor_id]
        : []

    if (vendorFilter !== 'all' && !baseVendorIds.includes(vendorFilter)) {
      return false
    }

    if (assignmentFilter === 'assigned' && baseVendorIds.length === 0) {
      return false
    }

    if (assignmentFilter === 'unassigned' && baseVendorIds.length > 0) {
      return false
    }

    if (dateRangeFilter !== 'all') {
      const created = new Date(template.created_at)
      if (Number.isNaN(created.getTime())) return false

      const now = new Date()

      if (dateRangeFilter === 'today') {
        const sameDay =
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        if (!sameDay) return false
      } else {
        const diffMs = now.getTime() - created.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (dateRangeFilter === '7d' && diffDays > 7) return false
        if (dateRangeFilter === '30d' && diffDays > 30) return false
      }
    }

    return true
  })

  const totalTemplates = filteredTemplates.length
  const totalPages = Math.max(1, Math.ceil(totalTemplates / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedTemplates = filteredTemplates.slice(startIndex, startIndex + rowsPerPage)

  const vendors: Vendor[] = memberships.map((m) => m.vendor)

  const getAssignedVendorsForTemplate = (template: ReceiptTemplate): Vendor[] => {
    const fromJoin = templateVendorAssignments[template.id]

    const baseVendorIds = fromJoin && fromJoin.length > 0
      ? fromJoin
      : template.vendor_id
      ? [template.vendor_id]
      : []

    if (baseVendorIds.length === 0) return []

    return vendors.filter((v) => baseVendorIds.includes(v.id))
  }

  const handleSaveVendorAssignments = async (template: ReceiptTemplate) => {
    if (assignTemplateId !== template.id) return

    try {
      setAssignSaving(true)
      setAssignError(null)
      const selectedVendorIds = assignSelectedVendorIds
      const primaryVendorId = selectedVendorIds[0] ?? null

      // Persist many-to-many assignments
      await templateVendorService.setVendorsForTemplate(template.id, selectedVendorIds)

      // Keep the legacy vendor_id column in sync with the first assigned vendor
      const updates: Partial<ReceiptTemplate> = {
        vendor_id: primaryVendorId,
      }

      const updated = await templateService.updateTemplate(template.id, updates)
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, vendor_id: updated.vendor_id } : t)),
      )

      setTemplateVendorAssignments((prev) => ({
        ...prev,
        [template.id]: selectedVendorIds,
      }))

      setAssignTemplateId(null)
      setAssignSelectedVendorIds([])
      setAssignSearch('')
      toast('Assignments saved', 'Template shop assignments have been updated.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign shops to template'
      setAssignError(message)
      toast('Failed to save assignments', message, 'error')
    } finally {
      setAssignSaving(false)
    }
  }

  const handleRequestDelete = (template: ReceiptTemplate) => {
    setTemplateToDelete(template)
    setShowDeleteConfirm(true)
  }

  const openPreview = (template: ReceiptTemplate) => {
    setPreviewTemplate(template)
    setShowTemplatePreview(true)
  }

  const buildPreviewHtml = (template: ReceiptTemplate) => {
    const safe = (value: unknown) => (typeof value === 'string' ? value : '')

    const templateHtml = safe(template.template_html)

    // Determine items column order from template (data-items-columns on tbody)
    type ItemCol =
      | 'description'
      | 'imei_or_model'
      | 'color'
      | 'discount'
      | 'tax'
      | 'quantity'
      | 'price'
      | 'total'

    let itemsColumns: ItemCol[] = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = templateHtml.match(/data-items-columns="([a-z_,]+)"/)
    if (itemsColumnsMatch && itemsColumnsMatch[1]) {
      const parts = itemsColumnsMatch[1].split(',').map((p) => p.trim()).filter(Boolean)
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

    const sampleRow = (name: string) => {
      const cells = itemsColumns
        .map((col) => {
          if (col === 'description') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>`
          }
          if (col === 'imei_or_model') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee;">123456789012345</td>`
          }
          if (col === 'color') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee;">Black</td>`
          }
          if (col === 'quantity') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">1</td>`
          }
          if (col === 'price') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳100.00</td>`
          }
          if (col === 'discount') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">-৳10.00</td>`
          }
          if (col === 'tax') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">+৳9.00</td>`
          }
          if (col === 'total') {
            return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳99.00</td>`
          }
          return ''
        })
        .join('')

      return `<tr>${cells}</tr>`
    }

    const itemsHtml = `${sampleRow('Sample Product 1')}${sampleRow('Sample Product 2')}`

    return templateHtml
      .replace(/{{RECEIPT_ID}}/g, 'PREVIEW-0001')
      .replace(/{{DATE}}/g, new Date().toLocaleDateString())
      .replace(/{{DUE_DATE}}/g, '')
      .replace(/{{CUSTOMER_NAME}}/g, 'John Doe')
      .replace(/{{CUSTOMER_EMAIL}}/g, 'john@example.com')
      .replace(/{{CUSTOMER_COMPANY}}/g, 'Acme Corp')
      .replace(/{{CUSTOMER_PHONE}}/g, '+1 (555) 000-0000')
      .replace(/{{CUSTOMER_ADDRESS}}/g, '123 Main St')
      .replace(/{{COMPANY_NAME}}/g, 'xReceipt')
      .replace(/{{COMPANY_EMAIL}}/g, 'info@xreceipt.com')
      .replace(/{{ITEMS}}/g, itemsHtml)
      .replace(/{{SUBTOTAL}}/g, '200.00')
      .replace(/{{DISCOUNT}}/g, '20.00')
      .replace(/{{DISCOUNT_TYPE}}/g, 'flat')
      .replace(/{{DISCOUNT_VALUE}}/g, '20.00')
      .replace(/{{DISCOUNT_META}}/g, '(৳20.00)')
      .replace(/{{ITEMS_DISCOUNT}}/g, '20.00')
      .replace(/{{RECEIPT_DISCOUNT}}/g, '0.00')
      .replace(/{{TOTAL_DISCOUNT}}/g, '20.00')
      .replace(/{{TAX}}/g, '18.00')
      .replace(/{{TAX_PERCENT}}/g, '10.00')
      .replace(/{{TAX_META}}/g, '(10.00%)')
      .replace(/{{ITEMS_TAX}}/g, '18.00')
      .replace(/{{RECEIPT_TAX}}/g, '0.00')
      .replace(/{{TOTAL_TAX}}/g, '18.00')
      .replace(/{{TOTAL}}/g, '198.00')
      .replace(/{{STATUS}}/g, 'draft')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Preview only')
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return

    try {
      setIsDeleting(true)
      await templateService.deleteTemplate(templateToDelete.id)
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
      setShowDeleteConfirm(false)
      setTemplateToDelete(null)
      toast('Template deleted', 'The template has been deleted.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      setError(message)
      toast('Failed to delete template', message, 'error')
    } finally {
      setIsDeleting(false)
    }
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
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-5 w-28" />
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
        <FileCode size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">No shop assigned</p>
        <p className="text-gray-500 text-sm mt-1">You are not assigned to any shop. Please contact a Grand User.</p>
      </div>
    )
  }

  if (!canViewTemplates) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FileCode size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Templates</p>
        <p className="text-gray-500 text-sm mt-1">Contact a Grand User if you think this is a mistake.</p>
      </div>
    )
  }

  // Mobile check - only block on mobile (< 768px), allow tablet and desktop
  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
          <FileCode size={32} className="text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Desktop & Tablet Only</h2>
        <p className="text-gray-600 max-w-sm">
          Receipt template creation is only available on desktop and tablet. Please open this page on a larger screen to create and manage templates.
        </p>
      </div>
    )
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (assignmentFilter !== 'all') count++
    if (vendorFilter !== 'all') count++
    if (dateRangeFilter !== 'all') count++
    return count
  }

  const clearAllFilters = () => {
    setAssignmentFilter('all')
    setVendorFilter('all')
    setDateRangeFilter('all')
    setSearchTerm('')
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Templates</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your receipt templates</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
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
                  {/* Assignment Filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignment</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'assigned', label: 'Assigned' },
                        { id: 'unassigned', label: 'Unassigned' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAssignmentFilter(option.id as 'all' | 'assigned' | 'unassigned')}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            assignmentFilter === option.id
                              ? 'bg-violet-100 text-violet-700 border-violet-300 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vendor Filter */}
                  {vendors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shop</p>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => setVendorFilter('all')}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            vendorFilter === 'all'
                              ? 'bg-violet-50 text-violet-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          All shops
                        </button>
                        {vendors.map((vendor) => (
                          <button
                            key={vendor.id}
                            type="button"
                            onClick={() => setVendorFilter(vendor.id)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                              vendorFilter === vendor.id
                                ? 'bg-violet-50 text-violet-700'
                                : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            {vendor.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
            {canCreateTemplates && (
              <span
                title={isGrandUserAllShops ? 'Select a shop first' : isPausedVendor ? 'Shop is inactive' : undefined}
                className="inline-flex"
              >
                <Button
                  onClick={() => handleNavigateToBuilder()}
                  size="sm"
                  disabled={isGrandUserAllShops || isPausedVendor}
                  className="h-10 rounded-lg"
                >
                  <Plus size={16} className="mr-1" />
                  Template Builder
                </Button>
              </span>
            )}
          </div>
        </div>

        {/* Active Filter Pills */}
        {(assignmentFilter !== 'all' || vendorFilter !== 'all' || dateRangeFilter !== 'all' || searchTerm) && (
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
            {assignmentFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Assignment: {assignmentFilter === 'assigned' ? 'Assigned' : 'Unassigned'}
                <button onClick={() => setAssignmentFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {vendorFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Shop: {vendors.find(v => v.id === vendorFilter)?.name || vendorFilter}
                <button onClick={() => setVendorFilter('all')} className="hover:text-violet-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {dateRangeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                Date: {dateRangeFilter === 'today' ? 'Today' : dateRangeFilter === '7d' ? 'Last 7 days' : 'Last 30 days'}
                <button onClick={() => setDateRangeFilter('all')} className="hover:text-violet-900">
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
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Templates Table */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <FileCode size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No templates found' : 'No templates yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first template to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedTemplates.map((template) => {
              const assignedVendors = getAssignedVendorsForTemplate(template)
              const usedCount = templateUsageCounts[template.id] ?? 0

              const buildInitials = (name: string) =>
                name
                  .split(' ')
                  .filter(Boolean)
                  .map((part) => part.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join('')

              return (
                <div key={template.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{template.name}</p>
                      <p className="text-xs text-gray-500 truncate">{template.description || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-semibold">
                          Used {usedCount}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreview(template)}
                        title="Preview"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateToBuilder?.(template.id)}
                        title="Edit"
                        className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestDelete(template)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">Assigned shop</span>
                    <div className="min-w-0">
                      {isGrandUser ? (() => {
                        const search = assignSearch.toLowerCase()
                        const filteredVendors = vendors.filter((v) =>
                          v.name.toLowerCase().includes(search),
                        )
                        const filteredIds = filteredVendors.map((v) => v.id)
                        const allSelectedForFiltered =
                          filteredIds.length > 0 &&
                          filteredIds.every((id) => assignSelectedVendorIds.includes(id))

                        return (
                          <DropdownMenu.Root
                            open={!isDesktop && assignTemplateId === template.id}
                            onOpenChange={(open) => {
                              if (isDesktop) return
                              if (open) {
                                setAssignTemplateId(template.id)
                                setAssignSearch('')
                                setAssignError(null)
                                const existingIds = templateVendorAssignments[template.id]
                                const validVendorIds = new Set(vendors.map((v) => v.id))
                                let baseIds: string[] =
                                  existingIds && existingIds.length > 0
                                    ? existingIds
                                    : template.vendor_id
                                      ? [template.vendor_id]
                                      : []

                                baseIds = baseIds.filter((id) => validVendorIds.has(id))
                                setAssignSelectedVendorIds(baseIds)
                              } else if (assignTemplateId === template.id && !assignSaving) {
                                setAssignTemplateId(null)
                                setAssignSelectedVendorIds([])
                                setAssignSearch('')
                                setAssignError(null)
                              }
                            }}
                          >
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50"
                              >
                                {assignedVendors.length > 0 ? (
                                  <span className="font-medium text-gray-800">
                                    {assignedVendors.length} assigned
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-600">Assign</span>
                                )}
                              </button>
                            </DropdownMenu.Trigger>

                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="min-w-[260px] rounded-md border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-1 z-50 space-y-2">
                                {vendors.length === 0 ? (
                                  <div className="px-2 py-1 text-xs text-gray-500">No shops available</div>
                                ) : (
                                  <>
                                    <div className="px-1">
                                      <Input
                                        type="text"
                                        placeholder="Search shops..."
                                        value={assignSearch}
                                        onChange={(e) => setAssignSearch(e.target.value)}
                                        className="h-8 text-xs border-gray-300"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          if (filteredIds.length === 0) return

                                          if (allSelectedForFiltered) {
                                            setAssignSelectedVendorIds((prev) =>
                                              prev.filter((id) => !filteredIds.includes(id)),
                                            )
                                          } else {
                                            setAssignSelectedVendorIds((prev) =>
                                              Array.from(new Set([...prev, ...filteredIds])),
                                            )
                                          }
                                        }}
                                        className="text-[11px] text-violet-600 hover:text-violet-700 font-medium cursor-pointer"
                                      >
                                        {allSelectedForFiltered ? 'Unselect all' : 'Select all'}
                                      </button>
                                    </div>
                                    {assignError && (
                                      <p className="px-1 text-[11px] text-red-600">{assignError}</p>
                                    )}
                                    <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                                      {filteredVendors.length === 0 ? (
                                        <div className="px-2 py-2 text-xs text-gray-500">No shops found</div>
                                      ) : (
                                        filteredVendors.map((vendor) => {
                                          const checked = assignSelectedVendorIds.includes(vendor.id)
                                          const vendorInitials = vendor.name
                                            .split(' ')
                                            .map((part) => part.charAt(0).toUpperCase())
                                            .slice(0, 2)
                                            .join('')

                                          return (
                                            <DropdownMenu.Item
                                              key={vendor.id}
                                              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                              onSelect={(event) => {
                                                event.preventDefault()
                                                setAssignSelectedVendorIds((prev) =>
                                                  checked
                                                    ? prev.filter((id) => id !== vendor.id)
                                                    : [...prev, vendor.id],
                                                )
                                              }}
                                            >
                                              <Checkbox
                                                checked={checked}
                                                className="h-3.5 w-3.5 rounded-[2px]"
                                                aria-hidden="true"
                                              />
                                              {vendor.image_url ? (
                                                <img
                                                  src={vendor.image_url}
                                                  alt={vendor.name}
                                                  className="w-6 h-6 rounded-full object-cover"
                                                />
                                              ) : (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                                                  {vendorInitials}
                                                </span>
                                              )}
                                              <span className="flex-1 truncate">{vendor.name}</span>
                                            </DropdownMenu.Item>
                                          )
                                        })
                                      )}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 px-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[11px]"
                                        onClick={() => {
                                          setAssignTemplateId(null)
                                          setAssignSelectedVendorIds([])
                                          setAssignSearch('')
                                          setAssignError(null)
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-3 text-[11px]"
                                        disabled={assignSaving}
                                        onClick={() => {
                                          void handleSaveVendorAssignments(template)
                                        }}
                                      >
                                        {assignSaving ? 'Saving...' : 'Save'}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        )
                      })() : assignedVendors.length > 0 ? (
                        <div className="inline-flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {assignedVendors.slice(0, 3).map((v) => (
                              <span
                                key={v.id}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-50 text-xs font-semibold text-violet-700"
                              >
                                {buildInitials(v.name)}
                              </span>
                            ))}
                            {assignedVendors.length > 3 && (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                                +{assignedVendors.length - 3}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-[140px]">
                            {assignedVendors.length === 1
                              ? assignedVendors[0].name
                              : `${assignedVendors[0].name} +${assignedVendors.length - 1}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Used</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedTemplates.map((template) => {
                  const assignedVendors = getAssignedVendorsForTemplate(template)

                  const buildInitials = (name: string) =>
                    name
                      .split(' ')
                      .filter(Boolean)
                      .map((part) => part.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('')

                  return (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {template.description || ' '}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {isGrandUser ? (() => {
                          const search = assignSearch.toLowerCase()
                          const filteredVendors = vendors.filter((v) =>
                            v.name.toLowerCase().includes(search),
                          )
                          const filteredIds = filteredVendors.map((v) => v.id)
                          const allSelectedForFiltered =
                            filteredIds.length > 0 &&
                            filteredIds.every((id) => assignSelectedVendorIds.includes(id))

                          return (
                            <DropdownMenu.Root
                              open={isDesktop && assignTemplateId === template.id}
                              onOpenChange={(open) => {
                                if (!isDesktop) return
                                if (open) {
                                  setAssignTemplateId(template.id)
                                  setAssignSearch('')
                                  setAssignError(null)
                                  const existingIds = templateVendorAssignments[template.id]
                                  const validVendorIds = new Set(vendors.map((v) => v.id))
                                  let baseIds: string[] =
                                    existingIds && existingIds.length > 0
                                      ? existingIds
                                      : template.vendor_id
                                      ? [template.vendor_id]
                                      : []

                                  baseIds = baseIds.filter((id) => validVendorIds.has(id))
                                  setAssignSelectedVendorIds(baseIds)
                                } else if (assignTemplateId === template.id && !assignSaving) {
                                  setAssignTemplateId(null)
                                  setAssignSelectedVendorIds([])
                                  setAssignSearch('')
                                  setAssignError(null)
                                }
                              }}
                            >
                              <DropdownMenu.Trigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center -space-x-1 px-0 py-0 cursor-pointer bg-transparent border-0"
                                  title={
                                    assignedVendors.length === 1
                                      ? assignedVendors[0].name
                                      : assignedVendors.length > 1
                                      ? `${assignedVendors[0].name} +${assignedVendors.length - 1}`
                                      : 'Assign shops'
                                  }
                                >
                                  {assignedVendors.length > 0 ? (
                                    <div className="flex items-center -space-x-1">
                                      {assignedVendors.slice(0, 3).map((v) => (
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
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-50 text-xs font-semibold text-violet-700"
                                          >
                                            {buildInitials(v.name)}
                                          </span>
                                        )
                                      ))}
                                      {assignedVendors.length > 3 && (
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                                          +{assignedVendors.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-500 px-1">Assign</span>
                                  )}
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content className="min-w-[260px] rounded-md border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-1 z-50 space-y-2">
                                  {vendors.length === 0 ? (
                                    <div className="px-2 py-1 text-xs text-gray-500">No shops available</div>
                                  ) : (
                                    <>
                                      <div className="px-1">
                                        <Input
                                          type="text"
                                          placeholder="Search shops..."
                                          value={assignSearch}
                                          onChange={(e) => setAssignSearch(e.target.value)}
                                          className="h-8 text-xs border-gray-300"
                                        />
                                      </div>
                                      <div className="flex items-center justify-between px-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            if (filteredIds.length === 0) return

                                            if (allSelectedForFiltered) {
                                              setAssignSelectedVendorIds((prev) =>
                                                prev.filter((id) => !filteredIds.includes(id)),
                                              )
                                            } else {
                                              setAssignSelectedVendorIds((prev) =>
                                                Array.from(new Set([...prev, ...filteredIds])),
                                              )
                                            }
                                          }}
                                          className="text-[11px] text-violet-600 hover:text-violet-700 font-medium cursor-pointer"
                                        >
                                          {allSelectedForFiltered ? 'Unselect all' : 'Select all'}
                                        </button>
                                      </div>
                                      {assignError && (
                                        <p className="px-1 text-[11px] text-red-600">{assignError}</p>
                                      )}
                                      <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                                        {filteredVendors.length === 0 ? (
                                          <div className="px-2 py-2 text-xs text-gray-500">No shops found</div>
                                        ) : (
                                          filteredVendors.map((vendor) => {
                                            const checked = assignSelectedVendorIds.includes(vendor.id)
                                            const vendorInitials = vendor.name
                                              .split(' ')
                                              .map((part) => part.charAt(0).toUpperCase())
                                              .slice(0, 2)
                                              .join('')

                                            return (
                                              <DropdownMenu.Item
                                                key={vendor.id}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                                onSelect={(event) => {
                                                  event.preventDefault()
                                                  setAssignSelectedVendorIds((prev) =>
                                                    checked
                                                      ? prev.filter((id) => id !== vendor.id)
                                                      : [...prev, vendor.id],
                                                  )
                                                }}
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  className="h-3.5 w-3.5 rounded-[2px]"
                                                  aria-hidden="true"
                                                />
                                                {vendor.image_url ? (
                                                  <img
                                                    src={vendor.image_url}
                                                    alt={vendor.name}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                                                    {vendorInitials}
                                                  </span>
                                                )}
                                                <span className="flex-1 truncate">{vendor.name}</span>
                                              </DropdownMenu.Item>
                                            )
                                          })
                                        )}
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 px-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => {
                                            setAssignTemplateId(null)
                                            setAssignSelectedVendorIds([])
                                            setAssignSearch('')
                                            setAssignError(null)
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-7 px-3 text-[11px]"
                                          disabled={assignSaving}
                                          onClick={() => {
                                            void handleSaveVendorAssignments(template)
                                          }}
                                        >
                                          {assignSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          )
                        })() : assignedVendors.length > 0 ? (
                          <div className="inline-flex items-center gap-2">
                            <div className="flex -space-x-1">
                              {assignedVendors.slice(0, 3).map((v) => (
                                <span
                                  key={v.id}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-50 text-xs font-semibold text-violet-700"
                                >
                                  {buildInitials(v.name)}
                                </span>
                              ))}
                              {assignedVendors.length > 3 && (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                                  +{assignedVendors.length - 3}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-700 truncate max-w-[120px]">
                              {assignedVendors.length === 1
                                ? assignedVendors[0].name
                                : `${assignedVendors[0].name} +${assignedVendors.length - 1}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-semibold">
                          {templateUsageCounts[template.id] ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreview(template)}
                            title="Preview"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateToBuilder?.(template.id)}
                            title="Edit"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestDelete(template)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing {totalTemplates === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalTemplates)} of {totalTemplates}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Rows per page</span>
                <Select.Root
                  value={String(rowsPerPage)}
                  onValueChange={(value) => {
                    const next = Number(value) || 10
                    setRowsPerPage(next)
                    setPage(1)
                  }}
                >
                  <Select.Trigger className="h-7 px-2 border border-gray-300 rounded-md text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 inline-flex items-center justify-between gap-2">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="h-3 w-3 text-gray-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      sideOffset={6}
                      className="z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                    >
                      <Select.Viewport className="py-1">
                        <Select.Item
                          value="10"
                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700 outline-none"
                        >
                          <Select.ItemText>10</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="25"
                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700 outline-none"
                        >
                          <Select.ItemText>25</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="50"
                          className="px-3 py-2 text-xs text-gray-800 rounded-md cursor-pointer flex items-center gap-2 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-700 outline-none"
                        >
                          <Select.ItemText>50</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
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
      {showDeleteConfirm && templateToDelete && (
        <Dialog
          open={showDeleteConfirm}
          onOpenChange={(open) => {
            setShowDeleteConfirm(open)
            if (!open) {
              setTemplateToDelete(null)
            }
          }}
        >
          <DialogContent className="max-w-sm p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg">Delete Template</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this template{' '}
                <span className="font-semibold">{templateToDelete.name}</span>?
              </p>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setTemplateToDelete(null)
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

      {showTemplatePreview && previewTemplate && (
        <Dialog
          open={showTemplatePreview}
          onOpenChange={(open) => {
            setShowTemplatePreview(open)
            if (!open) {
              setPreviewTemplate(null)
            }
          }}
        >
          <DialogContent className="max-w-5xl p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg">Template Preview</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <iframe
                  title="Template preview"
                  className="w-full h-[70vh] bg-white"
                  srcDoc={buildPreviewHtml(previewTemplate)}
                />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTemplatePreview(false)
                  setPreviewTemplate(null)
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const toOpen = previewTemplate
                  setShowTemplatePreview(false)
                  setPreviewTemplate(null)
                  onNavigateToBuilder?.(toOpen.id)
                }}
              >
                Edit template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
