import { useEffect, useRef, useState } from 'react'
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
  autoDownloadMode?: 'none' | 'pdf' | 'png'
  onAutoDownloadComplete?: () => void
}

export default function ReceiptPreviewModal({
  open,
  receipt,
  template,
  onClose,
  autoDownloadMode = 'none',
  onAutoDownloadComplete,
}: ReceiptPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false)

  const getPreviewHTML = () => {
    if (!receipt || !template) return ''

    // Use values from receipt
    const subtotal = receipt.subtotal || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    // Determine items column order from template (data-items-columns on tbody)
    let itemsColumns: Array<'description' | 'imei_or_model' | 'color' | 'quantity' | 'price' | 'total'> = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = template.template_html.match(/data-items-columns="([a-z_,]+)"/)
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

    // Build items HTML
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

    // Check if any item has tax enabled
    const hasTaxableItems = receipt.items && receipt.items.length > 0 && tax > 0

    const companyName = receipt.company_name || 'xReceipt'

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
      .replace(/{{COMPANY_NAME}}/g, companyName)
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

  // Reset tracking flags when modal is closed or receipt changes
  useEffect(() => {
    if (!open) {
      setIframeLoaded(false)
      setHasAutoDownloaded(false)
    } else {
      setHasAutoDownloaded(false)
    }
  }, [open, receipt?.id])

  // Automatically trigger download when requested (e.g. from list Download icon)
  useEffect(() => {
    if (!open || !iframeLoaded || hasAutoDownloaded) return

    const run = async () => {
      if (autoDownloadMode === 'pdf') {
        await downloadPDF()
        setHasAutoDownloaded(true)
        onAutoDownloadComplete?.()
      } else if (autoDownloadMode === 'png') {
        await downloadPNG()
        setHasAutoDownloaded(true)
        onAutoDownloadComplete?.()
      }
    }

    void run()
  }, [open, iframeLoaded, autoDownloadMode, hasAutoDownloaded])

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
      <DialogContent className="max-w-4xl w-full h-[95vh] p-0 flex flex-col bg-white sm:rounded-2xl">
        <DialogHeader className="px-6 py-3 border-b border-gray-200 bg-white">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileText size={18} />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-white">
          <iframe
            ref={iframeRef}
            title="Receipt preview"
            className="w-full h-full border-0 bg-white"
            srcDoc={getPreviewHTML()}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadPNG}
            disabled={isDownloading}
            className="h-8 px-3 text-xs"
          >
            <Image size={14} />
            <span className="ml-1">Download PNG</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={downloadPDF}
            disabled={isDownloading}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download size={14} />
            <span className="ml-1">Download PDF</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
