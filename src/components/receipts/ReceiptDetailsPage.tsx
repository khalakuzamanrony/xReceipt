import { useEffect, useRef, useState } from 'react'
import type { Receipt, ReceiptTemplate } from '@/types'
import { receiptService } from '@/services/receiptService'
import { templateService } from '@/services/templateService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ArrowLeft, Download, Mail, Copy, Loader, Image } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ReceiptDetailsPageProps {
  receiptId: string
  onBack: () => void
}

export default function ReceiptDetailsPage({ receiptId, onBack }: ReceiptDetailsPageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [template, setTemplate] = useState<ReceiptTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

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

      if (receiptData.template_id) {
        const templateData = await templateService.getTemplateById(receiptData.template_id)
        if (templateData) {
          setTemplate(templateData)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt')
    } finally {
      setLoading(false)
    }
  }

  const openEmailModal = () => {
    if (!receipt) return
    setEmailAddress(receipt.customer_email || '')
    setEmailError(null)
    setEmailModalOpen(true)
  }

  const handleSendEmail = async () => {
    if (!receipt) return

    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    try {
      setSendingEmail(true)
      setEmailError(null)
      await receiptService.sendReceiptEmail(receipt.id, emailAddress)
      setEmailModalOpen(false)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const getPreviewHTML = () => {
    if (!receipt || !template) return ''

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

    const hasTaxableItems = receipt.items && receipt.items.length > 0 && tax > 0

    const companyName = receipt.company_name || 'Company Name'

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
      .replace(/{{COMPANY_EMAIL}}/g, 'contact@company.com')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Thank you for your business!')

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
      setDownloading(true)
      const canvas = await html2canvas(target, {
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
    if (!receipt) return

    const target = getIframeBody()
    if (!target) return

    try {
      setDownloading(true)
      const canvas = await html2canvas(target, {
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
    } catch (err) {
      setError('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || 'Receipt not found'}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Actions */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Receipt #{receipt.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500">{receipt.customer_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            receipt.status === 'paid' ? 'bg-green-100 text-green-700' :
            receipt.status === 'sent' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={copyLink}
            variant="outline"
            size="sm"
            title="Copy link"
          >
            <Copy size={16} />
          </Button>
          <Button
            onClick={openEmailModal}
            variant="outline"
            size="sm"
            title="Send email"
          >
            <Mail size={16} />
          </Button>
          <Button
            onClick={downloadPNG}
            disabled={downloading}
            variant="outline"
            size="sm"
            title="Download PNG"
          >
            <Image size={16} />
          </Button>
          <Button
            onClick={downloadPDF}
            disabled={downloading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download size={16} />
            PDF
          </Button>
        </div>
      </div>

      {/* Main Content: Info on left, Receipt on right */}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* Left: Info Cards */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Customer</p>
              <p className="text-sm font-medium text-gray-900">{receipt.customer_name}</p>
              <button
                type="button"
                onClick={openEmailModal}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline cursor-pointer truncate"
              >
                {receipt.customer_email || 'Click to send via email'}
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Total</p>
              <p className="text-lg font-bold text-blue-600">${receipt.total?.toFixed(2) || '0.00'}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Subtotal ${receipt.subtotal?.toFixed(2) || '0.00'} · Tax ${receipt.tax?.toFixed(2) || '0.00'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Items</p>
              <p className="text-lg font-bold text-gray-900">{receipt.items?.length || 0}</p>
              <p className="text-[11px] text-gray-500 mt-1 truncate">
                {receipt.items && receipt.items.length > 0
                  ? receipt.items.map((item) => item.name).slice(0, 3).join(', ')
                  : 'No items'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Date</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(receipt.created_at).toLocaleDateString()} ·{' '}
                {new Date(receipt.created_at).toLocaleTimeString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 truncate">
                Template: {template?.name || 'Default'}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Billing details</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex justify-between gap-3">
                <span className="text-xs text-gray-500 uppercase">Company</span>
                <span className="text-sm text-gray-800 truncate">{receipt.customer_company || 'Not provided'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-xs text-gray-500 uppercase">Phone</span>
                <span className="text-sm text-gray-800 truncate">{receipt.customer_phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-xs text-gray-500 uppercase">Address</span>
                <span className="text-sm text-gray-800 truncate">{receipt.customer_address || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Receipt info</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex justify-between gap-3">
                <span className="text-xs text-gray-500 uppercase">Receipt #</span>
                <span className="text-sm text-gray-800 truncate">{receipt.receipt_number || receipt.id}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-xs text-gray-500 uppercase">Status</span>
                <span className="text-sm text-gray-800 truncate">
                  {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Receipt Content */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-8 overflow-x-auto">
            <iframe
              ref={iframeRef}
              title="Receipt preview"
              className="w-full border-0 rounded-md bg-white"
              style={{ minHeight: '600px' }}
              srcDoc={getPreviewHTML()}
            />
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-sm p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
            <DialogTitle className="text-lg">Send Receipt via Email</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-3">
            {emailError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                {emailError}
              </p>
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Email address</p>
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="customer@example.com"
                className="h-9 text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              The receipt will be sent to this email as a PDF using the selected template.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmailModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendingEmail ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
