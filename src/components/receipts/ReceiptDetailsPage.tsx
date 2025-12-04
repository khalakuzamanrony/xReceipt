import { useEffect, useRef, useState } from 'react'
import type { Receipt, ReceiptTemplate } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Download, Mail, Copy, Loader } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ReceiptDetailsPageProps {
  receiptId: string
  onBack: () => void
}

export default function ReceiptDetailsPage({ receiptId, onBack }: ReceiptDetailsPageProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [template, setTemplate] = useState<ReceiptTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadReceiptDetails()
  }, [receiptId])

  const loadReceiptDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!receiptId) {
        setError('Receipt ID not found')
        return
      }

      const receiptData = await receiptService.getReceiptById(receiptId)
      if (!receiptData) {
        setError('Receipt not found')
        return
      }

      setReceipt(receiptData)

      // Load template
      const templateData = await templateService.getTemplateById(receiptData.template_id)
      if (templateData) {
        setTemplate(templateData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt')
    } finally {
      setLoading(false)
    }
  }

  const getPreviewHTML = () => {
    if (!receipt || !template) return ''

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
      .replace(/{{COMPANY_NAME}}/g, 'Company Name')
      .replace(/{{COMPANY_EMAIL}}/g, 'contact@company.com')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Thank you for your business!')

    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^>]*>/g, '')
    }

    return html
  }

  const downloadPDF = async () => {
    if (!contentRef.current || !receipt) return

    try {
      setDownloading(true)
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`receipt-${receipt.id}.pdf`)
    } catch (err) {
      setError('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  const downloadPNG = async () => {
    if (!contentRef.current || !receipt) return

    try {
      setDownloading(true)
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `receipt-${receipt.id}.png`
      link.click()
    } catch (err) {
      setError('Failed to download PNG')
    } finally {
      setDownloading(false)
    }
  }

  const copyLink = async () => {
    try {
      const link = `${window.location.origin}/receipts/${receipt?.id}`
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Receipt not found'}</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft size={16} />
            Back to Receipts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 sm:gap-2 text-sm sm:text-base font-medium"
          >
            <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
            Back
          </button>
          <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Receipt #{receipt.id.slice(0, 8)}
          </h2>
          <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
            {receipt.status}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button
            onClick={copyLink}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs sm:text-sm flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            onClick={() => {}}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs sm:text-sm flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <Mail size={14} />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={downloading}
            size="sm"
            className="bg-black hover:bg-gray-800 text-white flex items-center gap-1 text-xs sm:text-sm flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <Download size={14} />
            PDF
          </Button>
          <Button
            onClick={downloadPNG}
            disabled={downloading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs sm:text-sm flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <Download size={14} />
            PNG
          </Button>
        </div>
      </div>

      {/* Receipt Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div
          ref={contentRef}
          className="p-4 sm:p-6 md:p-8 bg-white overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: getPreviewHTML() }}
        />
      </div>

      {/* Receipt Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Customer</h3>
          <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{receipt.customer_name}</p>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{receipt.customer_email}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Amount</h3>
          <p className="text-sm sm:text-base font-medium text-gray-900">${receipt.total?.toFixed(2) || '0.00'}</p>
          <p className="text-xs sm:text-sm text-gray-600">Total</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Date</h3>
          <p className="text-sm sm:text-base font-medium text-gray-900">
            {new Date(receipt.created_at).toLocaleDateString()}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">{new Date(receipt.created_at).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}
