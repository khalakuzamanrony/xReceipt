import { useRef, useState } from 'react'
import type { Receipt, ReceiptTemplate } from '@/types'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Download, FileText, Image } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ReceiptPreviewModalProps {
  open: boolean
  receipt: Receipt | null
  template: ReceiptTemplate | null
  onClose: () => void
}

export default function ReceiptPreviewModal({
  open,
  receipt,
  template,
  onClose,
}: ReceiptPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const getPreviewHTML = () => {
    if (!receipt || !template) return ''

    // Use values from receipt
    const subtotal = receipt.subtotal || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    // Determine items column order from template (data-items-columns on tbody)
    let itemsColumns: Array<'description' | 'quantity' | 'price' | 'total'> = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = template.template_html.match(/data-items-columns="([a-z,]+)"/)
    if (itemsColumnsMatch && itemsColumnsMatch[1]) {
      const parts = itemsColumnsMatch[1].split(',').map(p => p.trim()).filter(Boolean)
      const valid: Array<'description' | 'quantity' | 'price' | 'total'> = []
      for (const col of parts) {
        if (col === 'description' || col === 'quantity' || col === 'price' || col === 'total') {
          valid.push(col)
        }
      }
      if (valid.length) {
        itemsColumns = valid
      }
    }

    // Build items HTML
    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      itemsHTML = receipt.items
        .map((item) => {
          const cells = itemsColumns
            .map((col) => {
              if (col === 'description') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>`
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

    // Check if any item has tax enabled
    const hasTaxableItems = receipt.items && receipt.items.length > 0 && tax > 0

    let html = template.template_html
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
      .replace(/{{COMPANY_NAME}}/g, 'xReceipt')
      .replace(/{{COMPANY_EMAIL}}/g, 'info@xreceipt.com')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Thank you for your business!')

    // Hide tax row if no taxable items
    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^>]*>/g, '')
    }

    return html
  }

  const getIframeBody = () => {
    const iframe = iframeRef.current
    if (!iframe) return null
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return null
    return doc.body as HTMLElement
  }

  const downloadPDF = async () => {
    if (!receipt) return

    const target = getIframeBody()
    if (!target) return

    try {
      setIsDownloading(true)
      const canvas = await html2canvas(target, {
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
      pdf.save(`receipt-${receipt.id}.pdf`)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const downloadPNG = async () => {
    if (!receipt) return

    const target = getIframeBody()
    if (!target) return

    try {
      setIsDownloading(true)
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `receipt-${receipt.id}.png`
      link.click()
    } catch (error) {
      console.error('Failed to download PNG:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 border-gray-200 bg-white sm:rounded-2xl">
        <DialogHeader className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileText size={18} />
            Receipt Preview
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadPNG}
              disabled={isDownloading}
              className="h-8 px-2 text-xs text-gray-700 hover:bg-gray-100"
            >
              <Image size={14} />
              <span className="hidden sm:inline">PNG</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadPDF}
              disabled={isDownloading}
              className="h-8 px-2 text-xs text-gray-700 hover:bg-gray-100"
            >
              <Download size={14} />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 bg-gray-50">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
            <iframe
              ref={iframeRef}
              title="Receipt preview"
              className="w-full border-0 rounded-md bg-white"
              style={{ minHeight: '600px' }}
              srcDoc={getPreviewHTML()}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
