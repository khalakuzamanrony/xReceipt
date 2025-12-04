import { useRef, useState } from 'react'
import type { Receipt, ReceiptTemplate } from '@/types'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Download, FileText, X } from 'lucide-react'
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const getPreviewHTML = () => {
    if (!receipt || !template) return ''

    // Use values from receipt
    const subtotal = receipt.subtotal || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    // Build items HTML
    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      itemsHTML = receipt.items
        .map(
          (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.total.toFixed(2)}</td>
        </tr>
      `
        )
        .join('')
    } else {
      itemsHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 10px; color: #999; font-size: 12px;">
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

  const downloadPDF = async () => {
    if (!contentRef.current || !receipt) return

    try {
      setIsDownloading(true)
      const canvas = await html2canvas(contentRef.current, {
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
    if (!contentRef.current || !receipt) return

    try {
      setIsDownloading(true)
      const canvas = await html2canvas(contentRef.current, {
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
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 bg-gray-50">
          <div
            ref={contentRef}
            className="bg-white p-8 rounded-lg shadow-sm"
            dangerouslySetInnerHTML={{ __html: getPreviewHTML() }}
          />
        </div>

        <div className="border-t px-6 py-4 flex gap-3 justify-end bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDownloading}
          >
            <X size={16} />
            Close
          </Button>
          <Button
            onClick={downloadPNG}
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download PNG'}
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
