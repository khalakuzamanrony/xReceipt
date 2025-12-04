import { useEffect, useState } from 'react'
import type { ReceiptTemplate } from '@/types'
import { templateService } from '@/services/templateService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Edit, Trash2, AlertCircle, FileCode, Search, Zap } from 'lucide-react'
import ReceiptTemplateBuilder from './ReceiptTemplateBuilder'
import VisualReceiptBuilder from './VisualReceiptBuilder'
import PocketFilmsTemplate from './PocketFilmsTemplate'
import EleganceTemplate from './EleganceTemplate'

export default function TemplateList() {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
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

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setShowBuilder(false)}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4"
        >
          ← Back to Templates
        </button>
        <ReceiptTemplateBuilder onTemplateCreated={() => {
          setShowBuilder(false)
          loadTemplates()
        }} />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileCode size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receipt Templates</h1>
            <p className="text-gray-600 mt-1">Manage your receipt templates</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowElegance(true)} size="lg" className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700">
            <Plus size={20} />
            Elegance Invoice
          </Button>
          <Button onClick={() => setShowPocketFilms(true)} size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600">
            <Plus size={20} />
            Pocket Films
          </Button>
          <Button onClick={() => setShowNextGenBuilder(true)} size="lg" className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600">
            <Zap size={20} />
            Visual Builder
          </Button>
          <Button onClick={() => setShowBuilder(true)} variant="outline" size="lg">
            <Plus size={20} />
            Template Builder
          </Button>
          <Button onClick={handleAddNew} size="lg">
            <Plus size={20} />
            Add Template
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
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Template Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Edit Template' : 'Add New Template'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter template description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="html">Template HTML *</Label>
                <textarea
                  id="html"
                  value={formData.template_html}
                  onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                  placeholder="Enter HTML template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm h-48"
                  required
                />
              </div>

              <DialogFooter className="gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedTemplate ? 'Update' : 'Create'} Template
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileCode size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">
              {searchTerm ? 'No templates found' : 'No templates yet'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first template to get started.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddNew} className="mt-6">
                <Plus size={18} />
                Create First Template
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-gray-600">{template.description}</p>
                )}
                <div className="bg-gray-50 rounded p-3 max-h-32 overflow-hidden">
                  <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap break-words">
                    {template.template_html.substring(0, 200)}
                    {template.template_html.length > 200 ? '...' : ''}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
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
