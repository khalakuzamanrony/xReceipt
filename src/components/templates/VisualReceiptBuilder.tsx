import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Plus, Copy, Trash2, Zap, Grid3x3, Lock, Unlock } from 'lucide-react'

interface ReceiptElement {
  id: string
  type: 'header' | 'customer' | 'items' | 'totals' | 'footer' | 'divider' | 'text' | 'logo'
  label: string
  x: number
  y: number
  width: number
  height: number
  config: {
    fontSize?: number
    color?: string
    alignment?: 'left' | 'center' | 'right'
    padding?: number
    backgroundColor?: string
    borderColor?: string
    showBorder?: boolean
    customText?: string
  }
  locked?: boolean
}

const ELEMENT_TEMPLATES: Record<string, Omit<ReceiptElement, 'id' | 'x' | 'y'>> = {
  header: {
    type: 'header',
    label: 'Header',
    width: 350,
    height: 60,
    config: {
      fontSize: 24,
      color: '#1a1a1a',
      alignment: 'center',
      padding: 16,
      showBorder: false,
    },
  },
  customer: {
    type: 'customer',
    label: 'Customer Info',
    width: 350,
    height: 50,
    config: {
      fontSize: 12,
      color: '#333333',
      alignment: 'left',
      padding: 12,
      showBorder: false,
    },
  },
  items: {
    type: 'items',
    label: 'Items Table',
    width: 350,
    height: 100,
    config: {
      fontSize: 11,
      color: '#1a1a1a',
      alignment: 'left',
      padding: 8,
      showBorder: true,
      borderColor: '#cccccc',
    },
  },
  totals: {
    type: 'totals',
    label: 'Totals',
    width: 350,
    height: 80,
    config: {
      fontSize: 13,
      color: '#1a1a1a',
      alignment: 'right',
      padding: 12,
      showBorder: true,
      borderColor: '#000000',
    },
  },
  footer: {
    type: 'footer',
    label: 'Footer',
    width: 350,
    height: 40,
    config: {
      fontSize: 10,
      color: '#666666',
      alignment: 'center',
      padding: 12,
      showBorder: false,
    },
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    width: 350,
    height: 2,
    config: {
      borderColor: '#cccccc',
      padding: 8,
      showBorder: true,
    },
  },
  text: {
    type: 'text',
    label: 'Custom Text',
    width: 200,
    height: 40,
    config: {
      fontSize: 12,
      color: '#333333',
      alignment: 'left',
      padding: 8,
      customText: 'Edit text here',
    },
  },
  logo: {
    type: 'logo',
    label: 'Logo/Image',
    width: 100,
    height: 100,
    config: {
      alignment: 'center',
      padding: 12,
    },
  },
}

const GRID_SIZE = 10

const buildTemplateHtmlFromElements = (elements: ReceiptElement[]): string => {
  let html = `<div style="font-family: Arial, sans-serif; position: relative; width: 400px; height: 600px; margin: 0 auto; padding: 0;">`

  elements.forEach((element) => {
    const style = `position: absolute; left: ${element.x}px; top: ${element.y}px; width: ${element.width}px; height: ${element.height}px; font-size: ${
      element.config.fontSize || 12
    }px; color: ${element.config.color || '#000'}; text-align: ${element.config.alignment || 'left'}; padding: ${
      element.config.padding || 8
    }px; ${element.config.backgroundColor ? `background-color: ${element.config.backgroundColor};` : ''} ${
      element.config.showBorder ? `border-bottom: 1px solid ${element.config.borderColor || '#ccc'};` : ''
    }`

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
  return html
}

interface VisualReceiptBuilderProps {
  open: boolean
  onClose: () => void
  onSave: (template: { name: string; description: string; elements: ReceiptElement[] }) => void
}

export default function VisualReceiptBuilder({ open, onClose, onSave }: VisualReceiptBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [elements, setElements] = useState<ReceiptElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('My Custom Receipt')
  const [templateDesc, setTemplateDesc] = useState('A custom receipt template')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [previewHtml, setPreviewHtml] = useState<string>(() => buildTemplateHtmlFromElements([]))

  const selectedElement = elements.find(e => e.id === selectedId)

  const snap = (value: number) => (snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value)

  const addElement = (type: keyof typeof ELEMENT_TEMPLATES) => {
    const template = ELEMENT_TEMPLATES[type]
    const newElement: ReceiptElement = {
      ...template,
      id: Math.random().toString(36).substring(7),
      x: 50,
      y: elements.length * 120 + 50,
    }
    setElements([...elements, newElement])
    setSelectedId(newElement.id)
  }

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const duplicateElement = (id: string) => {
    const element = elements.find(e => e.id === id)
    if (!element) return
    const newElement: ReceiptElement = {
      ...element,
      id: Math.random().toString(36).substring(7),
      x: element.x + 20,
      y: element.y + 20,
    }
    setElements([...elements, newElement])
    setSelectedId(newElement.id)
  }

  const updateElement = (id: string, updates: Partial<ReceiptElement>) => {
    setElements(elements.map(e => (e.id === id ? { ...e, ...updates } : e)))
  }

  const updateConfig = (id: string, key: string, value: any) => {
    setElements(
      elements.map(e =>
        e.id === id
          ? {
              ...e,
              config: { ...e.config, [key]: value },
            }
          : e
      )
    )
  }

  const nudgeAll = (deltaY: number) => {
    setElements(prev =>
      prev.map(e => ({
        ...e,
        y: Math.max(0, e.y + deltaY),
      }))
    )
  }

  const nudgeSelectedRow = (deltaY: number) => {
    if (!selectedId) return
    setElements(prev =>
      prev.map(e =>
        e.id === selectedId
          ? {
              ...e,
              y: Math.max(0, e.y + deltaY),
            }
          : e
      )
    )
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if ((e.target as HTMLElement).closest('[data-resize]')) return

    const element = elements.find(el => el.id === elementId)
    if (!element || element.locked) return

    setSelectedId(elementId)
    setDraggingId(elementId)

    const canvasRect = canvasRef.current?.getBoundingClientRect()

    if (canvasRect) {
      setDragOffset({
        x: e.clientX - canvasRect.left - element.x,
        y: e.clientY - canvasRect.top - element.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    let x = e.clientX - canvasRect.left - dragOffset.x
    let y = e.clientY - canvasRect.top - dragOffset.y

    x = Math.max(0, Math.min(x, canvasRect.width - 50))
    y = Math.max(0, Math.min(y, canvasRect.height - 50))

    x = snap(x)
    y = snap(y)

    updateElement(draggingId, { x, y })
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (!element || element.locked) return

    setResizingId(elementId)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    })
  }

  useEffect(() => {
    if (!resizingId) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y

      let newWidth = snap(resizeStart.width + deltaX)
      let newHeight = snap(resizeStart.height + deltaY)

      newWidth = Math.max(50, newWidth)
      newHeight = Math.max(30, newHeight)

      updateElement(resizingId, { width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setResizingId(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingId, resizeStart])

  useEffect(() => {
    setPreviewHtml(buildTemplateHtmlFromElements(elements))
  }, [elements])

  const renderElement = (element: ReceiptElement) => {
    const style = {
      fontSize: `${element.config.fontSize || 12}px`,
      color: element.config.color || '#000',
      textAlign: element.config.alignment || 'left',
      padding: `${element.config.padding || 8}px`,
      backgroundColor: element.config.backgroundColor || 'transparent',
      borderBottom: element.config.showBorder ? `1px solid ${element.config.borderColor || '#ccc'}` : 'none',
    } as React.CSSProperties

    switch (element.type) {
      case 'header':
        return <div style={style}><strong>Company Name</strong></div>
      case 'customer':
        return <div style={style}>Customer Name<br/>customer@email.com</div>
      case 'items':
        return (
          <table style={{ width: '100%', ...style }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sample Item</td>
                <td>1</td>
                <td>$100</td>
                <td>$100</td>
              </tr>
            </tbody>
          </table>
        )
      case 'totals':
        return (
          <div style={style}>
            <div>Subtotal: $100.00</div>
            <div>Tax: $10.00</div>
            <div><strong>Total: $110.00</strong></div>
          </div>
        )
      case 'footer':
        return <div style={style}>Thank you for your business!</div>
      case 'divider':
        return <div style={{ borderBottom: `1px solid ${element.config.borderColor || '#ccc'}`, margin: '8px 0' }}></div>
      case 'text':
        return <div style={style}>{element.config.customText}</div>
      case 'logo':
        return <div style={style}>📷 Logo</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
          <DialogTitle className="flex items-center gap-3 text-white">
            <Zap size={24} className="text-purple-400" />
            Visual Receipt Builder
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-0">
          {/* Left Sidebar - Element Library */}
          <div className="w-48 bg-slate-950 border-r border-purple-500/20 overflow-y-auto p-4 space-y-3">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Add Elements</div>
            {Object.entries(ELEMENT_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => addElement(key as keyof typeof ELEMENT_TEMPLATES)}
                className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2 group"
              >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                <span className="truncate">{template.label}</span>
              </button>
            ))}

            <div className="pt-4 border-t border-slate-700 space-y-3">
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Tools</div>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`w-full px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  showGrid
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Grid3x3 size={14} />
                Show Grid
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`w-full px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  snapToGrid
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Grid3x3 size={14} />
                Snap to Grid
              </button>
              <button
                onClick={() => nudgeAll(-20)}
                className="w-full px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Move all up
              </button>
              <button
                onClick={() => nudgeAll(20)}
                className="w-full px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Move all down
              </button>
            </div>
          </div>

          {/* Center - Canvas */}
          <div
            className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 overflow-auto p-8 relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="max-w-md mx-auto space-y-4">
              {/* Receipt Canvas */}
              <div
                ref={canvasRef}
                className="relative bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-purple-500/30"
                style={{
                  backgroundImage: showGrid
                    ? `linear-gradient(0deg, transparent 24%, rgba(168, 85, 247, 0.05) 25%, rgba(168, 85, 247, 0.05) 26%, transparent 27%, transparent 74%, rgba(168, 85, 247, 0.05) 75%, rgba(168, 85, 247, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(168, 85, 247, 0.05) 25%, rgba(168, 85, 247, 0.05) 26%, transparent 27%, transparent 74%, rgba(168, 85, 247, 0.05) 75%, rgba(168, 85, 247, 0.05) 76%, transparent 77%, transparent)`
                    : 'none',
                  backgroundSize: showGrid ? `${GRID_SIZE * 4}px ${GRID_SIZE * 4}px` : 'auto',
                  minHeight: '600px',
                  width: '100%',
                }}
              >
                {/* Elements */}
                {elements.map(element => (
                  <div
                    key={element.id}
                    onMouseDown={e => handleMouseDown(e, element.id)}
                    onMouseMove={e => e.stopPropagation()}
                    className={`absolute cursor-move transition-all duration-100 group ${
                      selectedId === element.id
                        ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-white'
                        : 'hover:ring-2 hover:ring-purple-400 hover:ring-offset-1 hover:ring-offset-white'
                    } ${element.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                      backgroundColor: selectedId === element.id ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                    }}
                  >
                    {/* Content */}
                    <div className="w-full h-full overflow-hidden text-xs">
                      {renderElement(element)}
                    </div>

                    {/* Toolbar */}
                    {selectedId === element.id && !element.locked && (
                      <div className="absolute -top-8 left-0 flex gap-1 bg-slate-800 rounded-lg p-1 shadow-lg">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            duplicateElement(element.id)
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={12} className="text-slate-300" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            updateElement(element.id, { locked: true })
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                          title="Lock"
                        >
                          <Lock size={12} className="text-slate-300" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            removeElement(element.id)
                          }}
                          className="p-1 hover:bg-red-900 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    )}

                    {/* Locked Indicator */}
                    {element.locked && (
                      <div className="absolute -top-8 left-0 flex gap-1 bg-slate-800 rounded-lg p-1 shadow-lg">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            updateElement(element.id, { locked: false })
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                          title="Unlock"
                        >
                          <Unlock size={12} className="text-slate-300" />
                        </button>
                      </div>
                    )}

                    {/* Resize Handle */}
                    {selectedId === element.id && !element.locked && (
                      <div
                        data-resize
                        onMouseDown={e => handleResizeStart(e, element.id)}
                        className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-tl-lg cursor-nwse-resize hover:bg-purple-400 transition-colors"
                      />
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <p className="text-sm font-medium">Add elements to start building</p>
                      <p className="text-xs mt-1">Drag them around freely on the canvas</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live HTML preview */}
              <div className="bg-slate-900/80 rounded-lg border border-purple-500/40 overflow-hidden">
                <div className="px-3 py-2 border-b border-purple-500/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-100">Live Preview</span>
                  <span className="text-[10px] text-purple-300">Updates as you move sections and rows</span>
                </div>
                <div className="bg-slate-900 p-2">
                  <iframe
                    title="Visual builder live preview"
                    srcDoc={previewHtml}
                    className="w-full h-64 rounded-md border border-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 bg-slate-950 border-l border-purple-500/20 overflow-y-auto p-4 space-y-4">
            {selectedElement ? (
              <>
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Element Properties</div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Element Type</Label>
                    <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 border border-slate-700">
                      {selectedElement.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">X Position</Label>
                      <Input
                        type="number"
                        value={selectedElement.x}
                        onChange={e => updateElement(selectedId!, { x: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Y Position</Label>
                      <Input
                        type="number"
                        value={selectedElement.y}
                        onChange={e => updateElement(selectedId!, { y: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => nudgeSelectedRow(-40)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      Move row up
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSelectedRow(40)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      Move row down
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Width</Label>
                      <Input
                        type="number"
                        value={selectedElement.width}
                        onChange={e => updateElement(selectedId!, { width: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Height</Label>
                      <Input
                        type="number"
                        value={selectedElement.height}
                        onChange={e => updateElement(selectedId!, { height: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  </div>

                  {selectedElement.config.fontSize && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Font Size</Label>
                      <Input
                        type="number"
                        min="8"
                        max="32"
                        value={selectedElement.config.fontSize}
                        onChange={e => updateConfig(selectedId!, 'fontSize', parseInt(e.target.value))}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedElement.config.color && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Text Color</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.config.color}
                          onChange={e => updateConfig(selectedId!, 'color', e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedElement.config.color}
                          onChange={e => updateConfig(selectedId!, 'color', e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-sm flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {selectedElement.config.alignment && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Alignment</Label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map(align => (
                          <button
                            key={align}
                            onClick={() => updateConfig(selectedId!, 'alignment', align)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                              selectedElement.config.alignment === align
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedElement.config.customText !== undefined && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Custom Text</Label>
                      <Input
                        type="text"
                        value={selectedElement.config.customText}
                        onChange={e => updateConfig(selectedId!, 'customText', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedElement.config.padding !== undefined && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Padding</Label>
                      <Input
                        type="number"
                        min="0"
                        max="32"
                        value={selectedElement.config.padding}
                        onChange={e => updateConfig(selectedId!, 'padding', parseInt(e.target.value))}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedElement.config.backgroundColor && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Background</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.config.backgroundColor}
                          onChange={e => updateConfig(selectedId!, 'backgroundColor', e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedElement.config.backgroundColor}
                          onChange={e => updateConfig(selectedId!, 'backgroundColor', e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-sm flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Click an element on the canvas to edit</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-purple-500/20 bg-slate-900 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Template Name</Label>
              <Input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Description</Label>
              <Input
                type="text"
                value={templateDesc}
                onChange={e => setTemplateDesc(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={() =>
                onSave({
                  name: templateName,
                  description: templateDesc,
                  elements,
                })
              }
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white"
            >
              <Zap size={16} />
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
