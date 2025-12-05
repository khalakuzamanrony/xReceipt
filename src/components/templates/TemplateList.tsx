import { useEffect, useState } from 'react'
import type { ReceiptTemplate } from '@/types'
import { templateService } from '@/services/templateService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Plus, Edit, Trash2, AlertCircle, FileCode, Search, ChevronDown } from 'lucide-react'
import VisualReceiptBuilder from './VisualReceiptBuilder'
import PocketFilmsTemplate from './PocketFilmsTemplate'
import EleganceTemplate from './EleganceTemplate'

interface TemplateListProps {
  onNavigateToBuilder?: () => void
}

export default function TemplateList({ onNavigateToBuilder }: TemplateListProps) {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showNextGenBuilder, setShowNextGenBuilder] = useState(false)
  const [showPocketFilms, setShowPocketFilms] = useState(false)
  const [showElegance, setShowElegance] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_html: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await templateService.getAllTemplates()
      setTemplates(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates'
      setError(errorMessage)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await templateService.deleteTemplate(id)
      setTemplates(templates.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.template_html) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        template_html: formData.template_html,
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading templates...</p>
      </div>
    )
  }

  const handleVisualSave = async (data: { name: string; description: string; elements: any[] }) => {
    try {
      // Convert elements to HTML template with absolute positioning
      let html = `<div style="font-family: Arial, sans-serif; position: relative; width: 400px; height: 600px; margin: 0 auto; padding: 0;">`

      data.elements.forEach(element => {
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

      await templateService.createTemplate({
        name: data.name,
        description: data.description,
        template_html: html,
      })

      setShowNextGenBuilder(false)
      loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipt Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your receipt templates</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center gap-2 transition-colors">
                <Plus size={16} />
                <span>Create</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-48">
                <DropdownMenu.Item
                  onClick={() => onNavigateToBuilder?.()}
                  className="px-4 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer flex items-center gap-2 outline-none border-b border-gray-100"
                >
                  ✨ Custom Builder
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => setShowElegance(true)}
                  className="px-4 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer flex items-center gap-2 outline-none"
                >
                  📄 Elegance Invoice
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => setShowPocketFilms(true)}
                  className="px-4 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer flex items-center gap-2 outline-none"
                >
                  🎬 Pocket Films
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => setShowNextGenBuilder(true)}
                  className="px-4 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer flex items-center gap-2 outline-none"
                >
                  🎨 Visual Builder
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onNavigateToBuilder?.()}
                  className="px-4 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer flex items-center gap-2 outline-none"
                >
                  🔧 Template Builder
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <Button onClick={handleAddNew} size="sm">
            <Plus size={16} />
            Custom
          </Button>
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

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-0 focus:ring-0 p-0"
          />
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Preview</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {template.description || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500 font-mono max-w-xs truncate">
                        {template.template_html.substring(0, 50)}...
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 size={14} />
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

      {/* Visual Receipt Builder Modal */}
      <VisualReceiptBuilder
        open={showNextGenBuilder}
        onClose={() => setShowNextGenBuilder(false)}
        onSave={handleVisualSave}
      />

      {/* Pocket Films Invoice Template Modal */}
      <PocketFilmsTemplate
        open={showPocketFilms}
        onClose={() => setShowPocketFilms(false)}
        onSave={loadTemplates}
      />

      {/* Elegance Invoice Template Modal */}
      <EleganceTemplate
        open={showElegance}
        onClose={() => setShowElegance(false)}
        onSave={loadTemplates}
      />

    </div>
  )
}
