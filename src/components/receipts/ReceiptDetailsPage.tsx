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

    let templateHtml = template.template_html

    // Use values from receipt
    const subtotal = receipt.subtotal || 0
    const discount = receipt.discount || 0
    const tax = receipt.tax || 0
    const total = receipt.total || 0

    const safeNumber = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) ? n : 0
    }

    const clampPercent = (value: unknown) => {
      const n = safeNumber(value)
      return Math.min(100, Math.max(0, n))
    }

    const getItemTotals = (item: any) => {
      const quantity = Math.max(1, Math.trunc(safeNumber(item.quantity)))
      const unitPrice = Math.max(0, safeNumber(item.unit_price))
      const lineSubtotal = unitPrice * quantity

      const discountEnabled = item.discount_enabled === true
      const discountType = discountEnabled
        ? item.discount_type && item.discount_type !== 'none'
          ? item.discount_type
          : 'percentage'
        : 'none'
      const discountValueRaw = Math.max(0, safeNumber(item.discount_value))
      const discountValue =
        discountType === 'percentage'
          ? clampPercent(discountValueRaw)
          : discountType === 'flat'
            ? Math.min(unitPrice, Math.max(0, Math.floor(discountValueRaw)))
            : 0
      const discountAmountRaw =
        discountType === 'percentage'
          ? lineSubtotal * (discountValue / 100)
          : discountType === 'flat'
            ? discountValue * quantity
            : 0
      const lineDiscount = Math.min(Math.max(0, discountAmountRaw), lineSubtotal)

      const taxEnabled = item.tax_enabled !== false
      const taxPercentage = clampPercent(item.tax_percentage)
      const taxableBase = Math.max(0, lineSubtotal - lineDiscount)
      const lineTax = taxEnabled ? taxableBase * (taxPercentage / 100) : 0

      const lineTotal = taxableBase + lineTax

      return { lineSubtotal, lineDiscount, lineTax, lineTotal, taxEnabled, taxPercentage, discountType, discountValue }
    }

    let itemsSubtotal = 0
    let itemsDiscount = 0
    let itemsTax = 0
    if (receipt.items && receipt.items.length > 0) {
      for (const item of receipt.items as any[]) {
        const { lineSubtotal, lineDiscount, lineTax } = getItemTotals(item)
        itemsSubtotal += lineSubtotal
        itemsDiscount += lineDiscount
        itemsTax += lineTax
      }
    }

    const receiptDiscountType = ((receipt as any).discount_type as string | undefined) || 'none'
    const receiptDiscountValueRaw =
      typeof (receipt as any).discount_value === 'number' ? ((receipt as any).discount_value as number) : 0
    const receiptDiscountValue =
      receiptDiscountType === 'percentage'
        ? clampPercent(receiptDiscountValueRaw)
        : receiptDiscountType === 'flat'
          ? Math.max(0, Math.floor(receiptDiscountValueRaw))
          : 0

    const netAfterItemDiscount = Math.max(0, itemsSubtotal - itemsDiscount)
    const receiptDiscountAmountRaw =
      receiptDiscountType === 'percentage'
        ? netAfterItemDiscount * (receiptDiscountValue / 100)
        : receiptDiscountType === 'flat'
          ? receiptDiscountValue
          : 0
    const receiptDiscount = Math.min(Math.max(0, receiptDiscountAmountRaw), netAfterItemDiscount)

    const netAfterAllDiscounts = Math.max(0, netAfterItemDiscount - receiptDiscount)
    const receiptTaxPercent = clampPercent((receipt as any).tax_percent)
    const receiptTax = netAfterAllDiscounts * (receiptTaxPercent / 100)

    const totalDiscount = itemsDiscount + receiptDiscount
    const totalTax = itemsTax + receiptTax

    const taxPercent =
      typeof (receipt as any).tax_percent === 'number'
        ? ((receipt as any).tax_percent as number)
        : Math.max(0, subtotal - discount) > 0
          ? (tax / Math.max(0, subtotal - discount)) * 100
          : 0
    const safeTaxPercent = Number.isFinite(taxPercent) ? Math.max(0, taxPercent) : 0

    const discountType = receiptDiscountType
    const discountValue = receiptDiscountValue

    const taxMeta = safeTaxPercent > 0 ? `(${safeTaxPercent.toFixed(2)}%)` : ''
    const discountMeta =
      discountType === 'percentage' && discountValue > 0
        ? `(${discountValue.toFixed(2)}%)`
        : discountType === 'flat' && discountValue > 0
          ? `(৳${discountValue.toFixed(2)})`
          : ''

    type ItemCol =
      | 'description'
      | 'imei_or_model'
      | 'color'
      | 'discount'
      | 'tax'
      | 'quantity'
      | 'price'
      | 'total'

    const normalizeItemsColumns = (cols: ItemCol[]): ItemCol[] => {
      if (!cols.length) return cols

      const unique: ItemCol[] = Array.from(new Set(cols)) as ItemCol[]

      const has = (c: ItemCol) => unique.includes(c)
      const extrasBeforeQty: ItemCol[] = []
      if (has('imei_or_model')) extrasBeforeQty.push('imei_or_model')
      if (has('color')) extrasBeforeQty.push('color')

      const normalized: ItemCol[] = []
      if (has('description')) normalized.push('description')
      normalized.push(...extrasBeforeQty)
      if (has('quantity')) normalized.push('quantity')
      if (has('price')) normalized.push('price')
      if (has('tax')) normalized.push('tax')
      if (has('discount')) normalized.push('discount')
      if (has('total')) normalized.push('total')

      // Append any remaining known columns not covered above (defensive)
      for (const c of unique) {
        if (!normalized.includes(c)) normalized.push(c)
      }

      return normalized
    }

    const injectItemsHeaderColumns = (html: string, cols: ItemCol[]) => {
      if (!html) return html
      if (!cols.includes('tax') || !cols.includes('discount')) return html

      const hasTaxHeader = /<th[^>]*>\s*Tax\s*<\/th>/i.test(html)
      const hasDiscountHeader = /<th[^>]*>\s*Discount\s*<\/th>/i.test(html)
      if (hasTaxHeader && hasDiscountHeader) return html

      const theadMatch = html.match(/<thead[^>]*>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/i)
      if (!theadMatch) return html

      const headerRowInner = theadMatch[1]
      const taxTh = '<th class="text-right">Tax</th>'
      const discountTh = '<th class="text-right">Discount</th>'
      let updatedHeaderRowInner = headerRowInner

      const unitPriceThRegex = /(<th[^>]*>[\s\S]*?(Unit\s*Price|Price)[\s\S]*?<\/th>)/i
      const quantityThRegex = /(<th[^>]*>[\s\S]*?(Quantity|Qty)[\s\S]*?<\/th>)/i

      const unitMatch = headerRowInner.match(unitPriceThRegex)
      const qtyMatch = headerRowInner.match(quantityThRegex)

      if (unitMatch) {
        const insertion = `${unitMatch[1]}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
        updatedHeaderRowInner = headerRowInner.replace(unitPriceThRegex, insertion)
      } else if (qtyMatch) {
        const insertion = `${qtyMatch[1]}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
        updatedHeaderRowInner = headerRowInner.replace(quantityThRegex, insertion)
      } else {
        updatedHeaderRowInner = `${headerRowInner}${hasTaxHeader ? '' : taxTh}${hasDiscountHeader ? '' : discountTh}`
      }

      return html.replace(theadMatch[0], theadMatch[0].replace(headerRowInner, updatedHeaderRowInner))
    }

    // Determine items column order from template (data-items-columns on tbody)
    let itemsColumns: ItemCol[] = ['description', 'quantity', 'price', 'total']
    const itemsColumnsMatch = templateHtml.match(/data-items-columns="([a-z_,]+)"/)
    if (itemsColumnsMatch && itemsColumnsMatch[1]) {
      const parts = itemsColumnsMatch[1].split(',').map(p => p.trim()).filter(Boolean)
      const valid: ItemCol[] = []
      for (const col of parts) {
        if (
          col === 'description' ||
          col === 'imei_or_model' ||
          col === 'color' ||
          col === 'discount' ||
          col === 'tax' ||
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

    if (!itemsColumns.includes('tax')) itemsColumns.push('tax')
    if (!itemsColumns.includes('discount')) itemsColumns.push('discount')

    itemsColumns = normalizeItemsColumns(itemsColumns)
    if (itemsColumnsMatch) {
      templateHtml = templateHtml.replace(itemsColumnsMatch[0], `data-items-columns="${itemsColumns.join(',')}"`)
      templateHtml = injectItemsHeaderColumns(templateHtml, itemsColumns)
    }

    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      const hasDedicatedImeiColumn = itemsColumns.includes('imei_or_model')
      const hasDedicatedColorColumn = itemsColumns.includes('color')

      itemsHTML = (receipt.items as any[])
        .map((item) => {
          const { lineDiscount, lineTax, lineTotal, taxEnabled } = getItemTotals(item)

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
                  ? `<div style="margin-top: 2px; font-size: 11px; color: #666; line-height: 1.35;">${metaParts.join('<br/>')}</div>`
                  : ''

                return `<td style="padding: 8px; border-bottom: 1px solid #eee;"><div>${item.name}</div>${metaHtml}</td>`
              }
              if (col === 'imei_or_model') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.imei_or_model || ''}</td>`
              }
              if (col === 'color') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.color || ''}</td>`
              }
              if (col === 'discount') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.discount_enabled === true ? `-৳${lineDiscount.toFixed(2)}` : ''}</td>`
              }
              if (col === 'tax') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${taxEnabled ? `+৳${lineTax.toFixed(2)}` : ''}</td>`
              }
              if (col === 'quantity') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>`
              }
              if (col === 'price') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${Number(item.unit_price || 0).toFixed(2)}</td>`
              }
              if (col === 'total') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${lineTotal.toFixed(2)}</td>`
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

    const hasTaxableItems = receipt.items && receipt.items.length > 0 && Math.max(0, tax, totalTax) > 0

    const companyName = receipt.company_name || 'Company Name'

    const displayReceiptId = receipt.receipt_number || receipt.id

    let html = templateHtml
      .replace(/{{RECEIPT_ID}}/g, displayReceiptId)
      .replace(/{{DATE}}/g, new Date(receipt.created_at).toLocaleDateString())
      .replace(/{{DUE_DATE}}/g, '')
      .replace(/{{CUSTOMER_NAME}}/g, receipt.customer_name || '')
      .replace(/{{CUSTOMER_EMAIL}}/g, receipt.customer_email || '')
      .replace(/{{CUSTOMER_COMPANY}}/g, receipt.customer_company || '')
      .replace(/{{CUSTOMER_PHONE}}/g, receipt.customer_phone || '')
      .replace(/{{CUSTOMER_ADDRESS}}/g, receipt.customer_address || '')
      .replace(/{{ITEMS}}/g, itemsHTML)
      .replace(/{{TOTAL}}/g, total.toFixed(2))
      .replace(/{{SUBTOTAL}}/g, subtotal.toFixed(2))
      .replace(/{{TAX}}/g, hasTaxableItems ? tax.toFixed(2) : '0.00')
      .replace(/{{TAX_PERCENT}}/g, safeTaxPercent.toFixed(2))
      .replace(/{{TAX_META}}/g, taxMeta)
      .replace(/{{DISCOUNT}}/g, discount.toFixed(2))
      .replace(/{{DISCOUNT_TYPE}}/g, discountType)
      .replace(/{{DISCOUNT_VALUE}}/g, Number.isFinite(discountValue) ? discountValue.toFixed(2) : '0.00')
      .replace(/{{DISCOUNT_META}}/g, discountMeta)
      .replace(/{{ITEMS_DISCOUNT}}/g, itemsDiscount.toFixed(2))
      .replace(/{{RECEIPT_DISCOUNT}}/g, receiptDiscount.toFixed(2))
      .replace(/{{TOTAL_DISCOUNT}}/g, totalDiscount.toFixed(2))
      .replace(/{{ITEMS_TAX}}/g, itemsTax.toFixed(2))
      .replace(/{{RECEIPT_TAX}}/g, receiptTax.toFixed(2))
      .replace(/{{TOTAL_TAX}}/g, totalTax.toFixed(2))
      .replace(/{{STATUS}}/g, receipt.status)
      .replace(/{{COMPANY_NAME}}/g, companyName)
      .replace(/{{COMPANY_EMAIL}}/g, 'contact@company.com')
      .replace(/{{FOOTER_MESSAGE}}/g, 'Thank you for your business!')

    html = html.replace(/<div\s+class="total-row\s+items-total"[\s\S]*?<\/div>/gi, '')

    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^>]*>/g, '')
    }

    const normalizeReceiptStrip = (raw: string) => {
      try {
        const doc = new DOMParser().parseFromString(raw, 'text/html')
        const strip = doc.querySelector('.receipt-strip')
        if (!strip) return raw

        const meta = strip.querySelector('.receipt-strip-meta')
        const items = meta?.querySelectorAll('.meta-item')
        if (!items || items.length === 0) return raw

        const receiptMeta = items[0]
        const rightMetas = Array.from(items).slice(1)

        const left = doc.createElement('div')
        left.setAttribute('style', 'flex:1;text-align:left;white-space:nowrap')

        const title = doc.createElement('span')
        title.setAttribute('style', 'font-weight:bold;color:#2563eb')
        title.textContent = 'RECEIPT'

        const spacer = doc.createElement('span')
        spacer.setAttribute('style', 'margin-left:8px;white-space:nowrap')
        spacer.innerHTML = receiptMeta.innerHTML

        left.appendChild(title)
        left.appendChild(spacer)

        const right = doc.createElement('div')
        right.setAttribute('style', 'flex:1;text-align:right;white-space:nowrap')

        rightMetas.forEach((el, idx) => {
          const span = doc.createElement('span')
          span.setAttribute('style', 'white-space:nowrap')
          span.innerHTML = el.innerHTML
          right.appendChild(span)
          if (idx !== rightMetas.length - 1) {
            const gap = doc.createElement('span')
            gap.setAttribute('style', 'width:16px;display:inline-block')
            right.appendChild(gap)
          }
        })

        strip.innerHTML = ''
        strip.setAttribute('style', 'display:flex;justify-content:space-between;align-items:center;width:100%')
        strip.appendChild(left)
        strip.appendChild(right)

        return doc.documentElement.outerHTML
      } catch {
        return raw
      }
    }

    html = normalizeReceiptStrip(html)

    const previewCss =
      '<style>html,body{margin:0;padding:0;overflow-x:hidden;overflow-y:auto}.items-table tbody tr:nth-child(even){background-color:#f9fafb}table tbody tr:nth-child(even){background-color:#f9fafb}</style>'

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}${previewCss}`)
    } else {
      html = `${previewCss}${html}`
    }

    // Wrap in fixed-width container to maintain original receipt form
    html = `<div style="width: 794px; max-width: none; min-width: 794px; margin: 0 auto; box-sizing: border-box; overflow-x: hidden;">${html}</div>`

    return html
  }

  const getIframeBody = () => {
    const iframe = iframeRef.current
    if (!iframe) return null
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return null
    return doc.body as HTMLElement
  }

  const buildReceiptShareContext = () => {
    const r = receipt
    if (!r) throw new Error('Receipt not loaded')

    const receiptNo = r.receipt_number || r.id
    const receiptShort = r.id.slice(0, 8)
    const createdAt = new Date(r.created_at)
    const createdAtText = `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`
    const totalText = `৳${r.total?.toFixed(2) || '0.00'}`
    const customerName = r.customer_name || 'Customer'
    const toEmail = r.customer_email || ''
    const url = `${window.location.origin}/receipts/${r.id}`

    const subject = `Receipt ${receiptShort} • ${customerName} • ${totalText}`
    const bodyLines = [
      `Hello ${customerName},`,
      '',
      `Please find your receipt attached (${receiptNo}).`,
      `Date: ${createdAtText}`,
      `Total: ${totalText}`,
      '',
      `Receipt link: ${url}`,
      '',
      'Thank you.',
    ]

    const body = bodyLines.join('\n')
    const messageText = `Receipt ${receiptNo} (${totalText})\n${url}`

    return {
      receiptNo,
      subject,
      body,
      messageText,
      toEmail,
      url,
      customerName,
    }
  }

  const createReceiptPdfBlob = async (): Promise<Blob> => {
    const target = getIframeBody()
    if (!target) throw new Error('Receipt preview is not ready')

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

    return pdf.output('blob')
  }

  const openGmailCompose = () => {
    const ctx = buildReceiptShareContext()
    const to = encodeURIComponent(ctx.toEmail)
    const su = encodeURIComponent(ctx.subject)
    const body = encodeURIComponent(ctx.body)
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`, '_blank', 'noopener,noreferrer')
  }

  const openWhatsAppCompose = () => {
    const ctx = buildReceiptShareContext()
    const text = encodeURIComponent(ctx.messageText)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const downloadReceiptPdf = async () => {
    const pdfBlob = await createReceiptPdfBlob()
    const url = window.URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${receipt?.receipt_number || receipt?.id || 'download'}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleGmailShare = async () => {
    await downloadReceiptPdf()
    openGmailCompose()
  }

  const handleWhatsAppShare = async () => {
    await downloadReceiptPdf()
    openWhatsAppCompose()
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
      pdf.save(`receipt-${receipt.receipt_number || receipt.id}.pdf`)
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
      link.download = `receipt-${receipt.receipt_number || receipt.id}.png`
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
            <h1 className="text-xl font-bold text-gray-900">Receipt #{receipt.receipt_number || receipt.id}</h1>
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
            onClick={() => {
              void handleGmailShare()
            }}
            variant="outline"
            size="sm"
            title="Share via Gmail (attach PDF)"
          >
            <Mail size={16} />
          </Button>
          <Button
            onClick={() => {
              void handleWhatsAppShare()
            }}
            variant="outline"
            size="sm"
            title="Share via WhatsApp (attach PDF)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
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

      {/* Main Content: Info on left (shrink), Receipt on right (max space) */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr] items-start">
        {/* Left: Info Cards */}
        <div className="space-y-3 w-[280px] flex-shrink-0">
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
              <p className="text-lg font-bold text-blue-600">৳{receipt.total?.toFixed(2) || '0.00'}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Subtotal ৳{receipt.subtotal?.toFixed(2) || '0.00'} · Tax ৳{receipt.tax?.toFixed(2) || '0.00'}
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

        {/* Right: Receipt Content (max space) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-w-0">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="flex justify-center min-w-fit p-4 md:p-6">
              <iframe
                ref={iframeRef}
                title="Receipt preview"
                className="border-0 rounded-md bg-white block flex-shrink-0"
                style={{ minHeight: '600px', width: '794px', maxWidth: 'none', overflowX: 'hidden', overflowY: 'hidden' }}
                srcDoc={getPreviewHTML()}
              />
            </div>
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
