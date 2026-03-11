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

      for (const c of unique) {
        if (!normalized.includes(c)) normalized.push(c)
      }

      return normalized
    }

    const injectItemsHeaderColumns = (
      html: string,
      cols: ItemCol[]
    ) => {
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

    // Build items HTML
    let itemsHTML = ''
    if (receipt.items && receipt.items.length > 0) {
      const hasDedicatedImeiColumn = itemsColumns.includes('imei_or_model')
      const hasDedicatedColorColumn = itemsColumns.includes('color')

      itemsHTML = receipt.items
        .map((item: any) => {
          const { lineDiscount, lineTax, lineTotal, taxEnabled, taxPercentage } = getItemTotals(item)

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
                const discountMetaText =
                  item.discount_type === 'percentage' && item.discount_enabled
                    ? `${clampPercent(item.discount_value).toFixed(0)}%`
                    : item.discount_type === 'flat' && item.discount_enabled
                      ? `৳${Math.max(0, Math.floor(item.discount_value || 0)).toFixed(0)} flat`
                      : ''
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
                  ${item.discount_enabled === true ? `<div>-৳${lineDiscount.toFixed(2)}</div>` : '<div></div>'}
                  ${discountMetaText ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${discountMetaText}</div>` : ''}
                </td>`
              }
              if (col === 'tax') {
                const taxMetaText = taxEnabled ? `${taxPercentage.toFixed(0)}%` : ''
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
                  ${taxEnabled ? `<div>+৳${lineTax.toFixed(2)}</div>` : '<div></div>'}
                  ${taxMetaText ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${taxMetaText}</div>` : ''}
                </td>`
              }
              if (col === 'quantity') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>`
              }
              if (col === 'price') {
                return `<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${item.unit_price.toFixed(2)}</td>`
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

    // Check if any item has tax enabled
    const hasTaxableItems = receipt.items && receipt.items.length > 0 && Math.max(0, tax, totalTax) > 0

    const companyName = receipt.company_name || 'xReceipt'

    let html = templateHtml
    // Priority: receipt values > template values > defaults
    const footerMessage = receipt.footer_message || template.footer_message || 'Thank you for your business!'
    const notes = receipt.notes || template.footer_notes || ''

    html = html
      .replace(/{{RECEIPT_ID}}/g, receipt.receipt_number || receipt.id)
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
      .replace(/{{COMPANY_EMAIL}}/g, 'info@xreceipt.com')
      .replace(/{{FOOTER_MESSAGE}}/g, footerMessage)
      .replace(/{{NOTES}}/g, notes)

    html = html.replace(/<div\s+class="total-row\s+items-total"[\s\S]*?<\/div>/gi, '')

    // Hide tax row if no taxable items
    if (!hasTaxableItems) {
      html = html.replace(/Tax\s*\([^)]*\):[^<]*<[^>]*>[^<]*<\/[^>]*>/g, '')
    }

    const normalizeReceiptStrip = (raw: string) => {
      const stripMatch = raw.match(/<div\s+class=\"receipt-strip\"[^>]*>[\s\S]*?<\/div>/i)
      if (!stripMatch) return raw

      const stripHtml = stripMatch[0]
      const metaMatch = stripHtml.match(
        /<div\s+class=\"receipt-strip-meta\"[^>]*>([\s\S]*?)<\/div>/i,
      )
      if (!metaMatch) return raw

      const metaHtml = metaMatch[1]
      const metaItems = metaHtml
        .match(/<div\s+class=\"meta-item\"[\s\S]*?<\/div>/gi)
        ?.slice(0, 3)

      if (!metaItems || metaItems.length === 0) return raw

      const toSpan = (divHtml: string) => {
        const inner = divHtml
          .replace(/^<div[^>]*>/i, '')
          .replace(/<\/div>$/i, '')
        return `<span style=\"white-space:nowrap\">${inner}</span>`
      }

      const leftMeta = toSpan(metaItems[0])
      const rightMeta = metaItems.slice(1).map(toSpan).join('<span style="width:16px;display:inline-block"></span>')

      const normalizedStrip = `
<div class=\"receipt-strip\" style=\"display:flex;justify-content:space-between;align-items:center;width:100%\">
  <div style=\"flex:1;text-align:left;white-space:nowrap\">
    <span style=\"font-weight:bold;color:#2563eb;\">RECEIPT</span>
    <span style=\"margin-left:8px;\">${leftMeta}</span>
  </div>
  <div style=\"flex:1;text-align:right;white-space:nowrap\">${rightMeta}</div>
</div>`

      return raw.replace(stripHtml, normalizedStrip)
    }

    html = normalizeReceiptStrip(html)

    const previewCss =
      '<style>html,body{margin:0;padding:0;overflow-x:hidden;overflow-y:auto}.items-table tbody tr:nth-child(even){background-color:#f9fafb}table tbody tr:nth-child(even){background-color:#f9fafb}</style>'

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}${previewCss}`)
    } else {
      html = `${previewCss}${html}`
    }

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
      pdf.save(`receipt-${receipt.receipt_number || receipt.id}.pdf`)
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
      link.download = `receipt-${receipt.receipt_number || receipt.id}.png`
      link.click()
    } catch (error) {
      console.error('Failed to download PNG:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] p-0 flex flex-col bg-white overflow-hidden sm:rounded-2xl min-h-0">
        <DialogHeader className="px-6 py-3 border-b border-gray-200 bg-white">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileText size={18} />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-white">
          <div className="flex justify-center min-w-fit">
            <iframe
              ref={iframeRef}
              title="Receipt preview"
              className="border-0 bg-white block flex-shrink-0"
              style={{ minHeight: '600px', width: '794px', overflowX: 'hidden', overflowY: 'auto' }}
              srcDoc={getPreviewHTML()}
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
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
