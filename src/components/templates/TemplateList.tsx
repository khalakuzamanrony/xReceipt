import { useEffect, useState } from 'react'
import type { ReceiptTemplate, Vendor } from '@/types'
import { templateService } from '@/services/templateService'
import { templateVendorService } from '@/services/templateVendorService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Plus, Edit, Trash2, AlertCircle, FileCode, Search, Zap, Eye, Funnel } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import VisualReceiptBuilder from './VisualReceiptBuilder'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

interface TemplateListProps {
  onNavigateToBuilder?: () => void
}

export default function TemplateList({ onNavigateToBuilder }: TemplateListProps) {
  const { role, permissions } = useAuth()
  const canViewTemplates = role === 'grand_user' || !!permissions?.can_view_templates
  const canCreateTemplates = role === 'grand_user' || !!permissions?.can_create_templates
  const { memberships, activeVendorId, loading: vendorLoading } = useVendor()
  const isGrandUser = role === 'grand_user'
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showVisualBuilder, setShowVisualBuilder] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_html: '',
  })
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
  const [previewTemplate, setPreviewTemplate] = useState<ReceiptTemplate | null>(null)
  const [templateVendorAssignments, setTemplateVendorAssignments] = useState<Record<string, string[]>>({})
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')

  useEffect(() => {
    if (vendorLoading) return

    if (role === 'admin' && !activeVendorId) {
      setTemplates([])
      setLoading(false)
      return
    }

    void loadTemplates(activeVendorId)
  }, [vendorLoading, activeVendorId, role])

  const loadTemplates = async (vendorId?: string | null) => {
    try {
      setLoading(true)
      setError(null)
      const vendorFilter = vendorId ?? undefined
      const data = await templateService.getAllTemplates(vendorFilter)
      setTemplates(data)

      // Load many-to-many vendor assignments for these templates so we can
      // show stacked avatars and pre-select saved vendors in the dropdown.
      const templateIds = data.map((t) => t.id)
      if (templateIds.length > 0) {
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
      } else {
        setTemplateVendorAssignments({})
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates'
      setError(errorMessage)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const isVendorSuperAdminForActiveVendor =
    role === 'admin' &&
    !!activeVendorId &&
    memberships.some((m) => m.vendor.id === activeVendorId && m.isVendorSuperAdmin)

  const assignedTemplateIds = permissions?.assigned_template_ids || []
  const permissionFilteredTemplates =
    role === 'admin' &&
    !isVendorSuperAdminForActiveVendor &&
    permissions?.can_view_templates &&
    permissions?.can_assign_templates &&
    assignedTemplateIds.length > 0
      ? templates.filter((template) => assignedTemplateIds.includes(template.id))
      : templates

  const filteredTemplates = permissionFilteredTemplates.filter((template) => {
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

  const buildTemplatePreviewHtml = (template: ReceiptTemplate) => {
    const sampleItemsHtml = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Sample item A</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">1</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$50.00</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$50.00</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Sample item B</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">2</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$25.00</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$50.00</td>
      </tr>
    `

    let html = template.template_html
      .replace(/{{RECEIPT_ID}}/g, 'PREVIEW-001')
      .replace(/{{DATE}}/g, new Date().toLocaleDateString())
      .replace(/{{CUSTOMER_NAME}}/g, 'Customer Name (preview only)')
      .replace(/{{CUSTOMER_EMAIL}}/g, 'customer.preview@example.test')
      .replace(/{{CUSTOMER_COMPANY}}/g, 'Customer Company (preview only)')
      .replace(/{{CUSTOMER_PHONE}}/g, '+1 (000) 000-0000')
      .replace(/{{CUSTOMER_ADDRESS}}/g, 'Customer address (preview only)')
      .replace(/{{ITEMS}}/g, sampleItemsHtml)
      .replace(/{{TOTAL}}/g, '100.00')
      .replace(/{{SUBTOTAL}}/g, '90.00')
      .replace(/{{TAX}}/g, '10.00')
      .replace(/{{STATUS}}/g, 'preview')
      .replace(/{{COMPANY_NAME}}/g, 'xReceipt – Template Preview')
      .replace(/{{COMPANY_EMAIL}}/g, 'preview@xreceipt.local')
      .replace(/{{FOOTER_MESSAGE}}/g, 'This is a template preview using only sample data.')

    return html
  }

  const handleOpenPreview = (template: ReceiptTemplate) => {
    setPreviewTemplate(template)
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign vendors to template'
      setAssignError(message)
    } finally {
      setAssignSaving(false)
    }
  }

  const handleAddNew = () => {
    // Require a vendor selection before creating templates
    if (!activeVendorId) {
      setError('Please select a vendor from the header before creating templates.')
      return
    }

    setSelectedTemplate(null)
    setFormData({ name: '', description: '', template_html: '' })
    setShowForm(true)
  }

  const handleEdit = (template: ReceiptTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      template_html: template.template_html,
    })
    setShowForm(true)
  }

  const handleRequestDelete = (template: ReceiptTemplate) => {
    setTemplateToDelete(template)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return

    try {
      setIsDeleting(true)
      await templateService.deleteTemplate(templateToDelete.id)
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
      setShowDeleteConfirm(false)
      setTemplateToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.template_html) {
      setError('Please fill in all required fields')
      return
    }

    const isNew = !selectedTemplate

    // New templates must always be tied to a specific vendor
    if (isNew && !activeVendorId) {
      setError('Please select a vendor from the header before creating templates.')
      return
    }

    try {
      const templateData: any = {
        name: formData.name,
        description: formData.description,
        template_html: formData.template_html,
      }

      if (isNew && activeVendorId) {
        templateData.vendor_id = activeVendorId
      }

      if (selectedTemplate) {
        await templateService.updateTemplate(selectedTemplate.id, templateData)
      } else {
        await templateService.createTemplate(templateData)
      }

      setShowForm(false)
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const handleVisualSave = async (data: { name: string; description: string; elements: any[] }) => {
    try {
      if (!activeVendorId) {
        setError('Please select a vendor from the header before creating templates.')
        return
      }

      // Convert elements to HTML template with absolute positioning
      let html = `<div style="font-family: Arial, sans-serif; position: relative; width: 400px; height: 600px; margin: 0 auto; padding: 0;">`

      data.elements.forEach((element: any) => {
        const style = `position: absolute; left: ${element.x}px; top: ${element.y}px; width: ${element.width}px; height: ${element.height}px; font-size: ${element.config.fontSize || 12}px; color: ${element.config.color || '#000'}; text-align: ${element.config.alignment || 'left'}; padding: ${element.config.padding || 8}px; ${element.config.backgroundColor ? `background-color: ${element.config.backgroundColor};` : ''} ${element.config.showBorder ? `border-bottom: 1px solid ${element.config.borderColor || '#ccc'};` : ''}`

        switch (element.type) {
          case 'header':
            html += `<div style="${style}"><strong>{{COMPANY_NAME}}</strong></div>`
            break
          case 'customer':
            html += `<div style="${style}">{{CUSTOMER_NAME}}<br/>{{CUSTOMER_EMAIL}}</div>`
            break
          case 'items':
            html += `<table style="${style}; width: 100%;"><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{{ITEMS}}</tbody></table>`
            break
          case 'totals':
            html += `<div style="${style}"><div>Subtotal: {{SUBTOTAL}}</div><div>Tax: {{TAX}}</div><div><strong>Total: {{TOTAL}}</strong></div></div>`
            break
          case 'footer':
            html += `<div style="${style}">{{FOOTER_MESSAGE}}</div>`
            break
          case 'divider':
            html += `<div style="${style}; border-bottom: 1px solid ${element.config.borderColor || '#ccc'};"></div>`
            break
          case 'text':
            html += `<div style="${style}">${element.config.customText || ''}</div>`
            break
          case 'logo':
            html += `<div style="${style}"><img src="logo.png" alt="Logo" style="max-width: 100%; height: auto;" /></div>`
            break
        }
      })

      html += '</div>'

      const payload: any = {
        name: data.name,
        description: data.description,
        template_html: html,
      }

      payload.vendor_id = activeVendorId

      await templateService.createTemplate(payload)

      setShowVisualBuilder(false)
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  if (loading || vendorLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading templates...</p>
      </div>
    )
  }

  if (role === 'admin' && !activeVendorId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FileCode size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">No vendor assigned</p>
        <p className="text-gray-500 text-sm mt-1">You are not assigned to any vendor. Please contact a Grand User.</p>
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

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Templates</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your receipt templates</p>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search Bar */}
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
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
                      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Assignment</p>
                      <div className="flex flex-wrap gap-1.5">
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
                              'px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors',
                              assignmentFilter === option.id
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {vendors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Vendor</p>
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setVendorFilter('all')}
                            className={cn(
                              'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                              vendorFilter === 'all'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            All vendors
                          </button>
                          {vendors.map((vendor) => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => setVendorFilter(vendor.id)}
                              className={cn(
                                'w-full text-left px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                                vendorFilter === vendor.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              )}
                            >
                              {vendor.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

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
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentFilter('all')
                          setVendorFilter('all')
                          setDateRangeFilter('all')
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Action Buttons */}
              {canCreateTemplates && (
                <div className="flex gap-2 flex-wrap sm:justify-end">
                  <Button onClick={() => onNavigateToBuilder?.()} size="sm">
                    <Plus size={16} />
                    Template Builder
                  </Button>
                  <Button onClick={() => setShowVisualBuilder(true)} size="sm" variant="secondary">
                    <Zap size={16} />
                    Visual Builder
                  </Button>
                  <Button onClick={handleAddNew} size="sm">
                    <Plus size={16} />
                    Custom
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* Template Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedTemplate ? 'Edit Template' : 'Add New Template'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900">Template Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-900">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter template description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="html" className="text-sm font-semibold text-gray-900">Template HTML *</Label>
                <textarea
                  id="html"
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  placeholder="Enter HTML template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-48"
                  required
                />
              </div>

              <DialogFooter className="gap-3 border-t border-gray-200 pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {selectedTemplate ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Preview</th>
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
                          {template.description || ''}
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
                              open={assignTemplateId === template.id}
                              onOpenChange={(open) => {
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
                                      : 'Assign vendors'
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
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
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
                                    <div className="px-2 py-1 text-xs text-gray-500">No vendors available</div>
                                  ) : (
                                    <>
                                      <div className="px-1">
                                        <Input
                                          type="text"
                                          placeholder="Search vendors..."
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
                                          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                        >
                                          {allSelectedForFiltered ? 'Unselect all' : 'Select all'}
                                        </button>
                                      </div>
                                      {assignError && (
                                        <p className="px-1 text-[11px] text-red-600">{assignError}</p>
                                      )}
                                      <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                                        {filteredVendors.length === 0 ? (
                                          <div className="px-2 py-2 text-xs text-gray-500">No vendors found</div>
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
                                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
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
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
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
                        <p className="text-xs text-gray-500 font-mono max-w-xs truncate">
                          {template.template_html.substring(0, 50)}...
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(template)}
                            title="Preview template"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
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
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {totalTemplates === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalTemplates)} of {totalTemplates}
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

      {/* Template preview modal */}
      {previewTemplate && (
        <Dialog
          open={!!previewTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewTemplate(null)
            }
          }}
        >
          <DialogContent className="max-w-4xl w-full h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
              <DialogTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Eye size={18} />
                <span>Template Preview - {previewTemplate.name}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-white">
              <iframe
                title="Template preview"
                className="w-full h-full border-0 bg-white"
                srcDoc={buildTemplatePreviewHtml(previewTemplate)}
              />
            </div>
            <DialogFooter className="px-6 py-3 border-t border-gray-200 bg-white flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <DialogContent className="max-w-sm w-full p-0 flex flex-col">
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

      <VisualReceiptBuilder
        open={showVisualBuilder}
        onClose={() => setShowVisualBuilder(false)}
        onSave={handleVisualSave}
      />

    </div>
  )
}
