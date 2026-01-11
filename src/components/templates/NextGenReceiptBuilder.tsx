import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Plus, Copy, Trash2, Zap, Eye } from 'lucide-react'

interface ReceiptBlock {
  id: string
  type: 'header' | 'customer' | 'items' | 'totals' | 'footer' | 'divider' | 'text' | 'logo'
  label: string
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
  order: number
}

const BLOCK_TEMPLATES: Record<string, Omit<ReceiptBlock, 'id' | 'order'>> = {
  header: {
    type: 'header',
    label: 'Header',
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
    config: {
      borderColor: '#cccccc',
      padding: 8,
      showBorder: true,
    },
  },
  text: {
    type: 'text',
    label: 'Custom Text',
    config: {
      fontSize: 12,
      color: '#333333',
      alignment: 'left',
      padding: 8,
      customText: 'Enter text here',
    },
  },
  logo: {
    type: 'logo',
    label: 'Logo/Image',
    config: {
      alignment: 'center',
      padding: 12,
    },
  },
}

interface NextGenReceiptBuilderProps {
  open: boolean
  onClose: () => void
  onSave: (template: { name: string; description: string; blocks: ReceiptBlock[] }) => void
}

export default function NextGenReceiptBuilder({ open, onClose, onSave }: NextGenReceiptBuilderProps) {
  const [blocks, setBlocks] = useState<ReceiptBlock[]>([
    { ...BLOCK_TEMPLATES.header, id: '1', order: 1 },
    { ...BLOCK_TEMPLATES.customer, id: '2', order: 2 },
    { ...BLOCK_TEMPLATES.items, id: '3', order: 3 },
    { ...BLOCK_TEMPLATES.totals, id: '4', order: 4 },
    { ...BLOCK_TEMPLATES.footer, id: '5', order: 5 },
  ])
  const [selectedBlockId, setSelectedBlockId] = useState<string>('1')
  const [templateName, setTemplateName] = useState('My Custom Receipt')
  const [templateDesc, setTemplateDesc] = useState('A custom receipt template')
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  const addBlock = (type: keyof typeof BLOCK_TEMPLATES) => {
    const newBlock: ReceiptBlock = {
      ...BLOCK_TEMPLATES[type],
      id: Math.random().toString(36).substring(7),
      order: Math.max(...blocks.map(b => b.order), 0) + 1,
    }
    setBlocks([...blocks, newBlock])
    setSelectedBlockId(newBlock.id)
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
    if (selectedBlockId === id) {
      setSelectedBlockId(blocks[0]?.id || '')
    }
  }

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    const newBlock: ReceiptBlock = {
      ...block,
      id: Math.random().toString(36).substring(7),
      order: Math.max(...blocks.map(b => b.order), 0) + 1,
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlockConfig = (id: string, key: string, value: any) => {
    setBlocks(
      blocks.map(b =>
        b.id === id
          ? {
              ...b,
              config: { ...b.config, [key]: value },
            }
          : b
      )
    )
  }

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id)
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]]
      setBlocks(newBlocks)
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]
      setBlocks(newBlocks)
    }
  }

  const handleDragStart = (id: string) => {
    setDraggedBlock(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (!draggedBlock || draggedBlock === targetId) return

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlock)
    const targetIndex = blocks.findIndex(b => b.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newBlocks = [...blocks]
    ;[newBlocks[draggedIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[draggedIndex]]
    setBlocks(newBlocks)
    setDraggedBlock(null)
  }


  const handleSave = () => {
    onSave({
      name: templateName,
      description: templateDesc,
      blocks,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
          <DialogTitle className="flex items-center gap-3 text-white">
            <Zap size={24} className="text-purple-400" />
            Next-Gen Receipt Builder
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-0">
          {/* Left Sidebar - Block Library */}
          <div className="w-48 bg-slate-950 border-r border-purple-500/20 overflow-y-auto p-4 space-y-3">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Add Blocks</div>
            {Object.entries(BLOCK_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => addBlock(key as keyof typeof BLOCK_TEMPLATES)}
                className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm rounded-lg transition-all duration-200 flex items-center gap-2 group"
              >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                <span className="truncate">{template.label}</span>
              </button>
            ))}
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 overflow-auto p-6">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-purple-500/20">
                {/* Canvas Header */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Receipt Preview</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Toggle preview"
                      >
                        <Eye size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canvas Blocks */}
                <div className="p-4 space-y-2 min-h-96">
                  {blocks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">No blocks added. Start by adding blocks from the left panel.</p>
                    </div>
                  ) : (
                    blocks.map((block, index) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(block.id)}
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`p-3 rounded-lg border-2 cursor-move transition-all duration-200 group ${
                          selectedBlockId === block.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 bg-slate-50 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                            <span className="font-medium text-sm text-slate-900">{block.label}</span>
                            <span className="text-xs text-slate-500">#{index + 1}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                duplicateBlock(block.id)
                              }}
                              className="p-1 hover:bg-slate-200 rounded transition-colors"
                              title="Duplicate"
                            >
                              <Copy size={14} className="text-slate-600" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                removeBlock(block.id)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 ml-3">
                          {block.type === 'text' ? block.config.customText : `Type: ${block.type}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 bg-slate-950 border-l border-purple-500/20 overflow-y-auto p-4 space-y-4">
            {selectedBlock ? (
              <>
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Block Properties</div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Block Type</Label>
                    <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 border border-slate-700">
                      {selectedBlock.label}
                    </div>
                  </div>

                  {selectedBlock.config.fontSize && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Font Size</Label>
                      <Input
                        type="number"
                        min="8"
                        max="32"
                        value={selectedBlock.config.fontSize}
                        onChange={e => updateBlockConfig(selectedBlockId, 'fontSize', parseInt(e.target.value))}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedBlock.config.color && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Text Color</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedBlock.config.color}
                          onChange={e => updateBlockConfig(selectedBlockId, 'color', e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedBlock.config.color}
                          onChange={e => updateBlockConfig(selectedBlockId, 'color', e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-sm flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {selectedBlock.config.alignment && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Alignment</Label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map(align => (
                          <button
                            key={align}
                            onClick={() => updateBlockConfig(selectedBlockId, 'alignment', align)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                              selectedBlock.config.alignment === align
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

                  {selectedBlock.config.customText !== undefined && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Custom Text</Label>
                      <Input
                        type="text"
                        value={selectedBlock.config.customText}
                        onChange={e => updateBlockConfig(selectedBlockId, 'customText', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedBlock.config.padding !== undefined && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Padding</Label>
                      <Input
                        type="number"
                        min="0"
                        max="32"
                        value={selectedBlock.config.padding}
                        onChange={e => updateBlockConfig(selectedBlockId, 'padding', parseInt(e.target.value))}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                  )}

                  {selectedBlock.config.backgroundColor && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Background</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedBlock.config.backgroundColor}
                          onChange={e => updateBlockConfig(selectedBlockId, 'backgroundColor', e.target.value)}
                          className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedBlock.config.backgroundColor}
                          onChange={e => updateBlockConfig(selectedBlockId, 'backgroundColor', e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-sm flex-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-700 space-y-2">
                    <Label className="text-xs text-slate-300">Actions</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveBlock(selectedBlockId, 'up')}
                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        ↑ Move Up
                      </button>
                      <button
                        onClick={() => moveBlock(selectedBlockId, 'down')}
                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        ↓ Move Down
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Select a block to edit its properties</p>
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
              onClick={handleSave}
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
