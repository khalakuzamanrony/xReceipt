import { useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { templateService } from '@/services/templateService'
import {
    Building2,
    User,
    Mail,
    Phone,
    MapPin,
    FileText,
    Hash,
    DollarSign,
    Package,
    Image as ImageIcon,
    Globe
} from 'lucide-react'

interface CustomTemplateBuilderProps {
    open: boolean
    onClose: () => void
    onSave?: () => void
    isFullPage?: boolean
    isPage?: boolean
}

type LayoutVariant =
    | 'classic'
    | 'classic-totals-left'
    | 'classic-notes-between'
    | 'split-header'
    | 'split-totals-left'
    | 'split-totals-first'
    | 'top-strip'
    | 'top-strip-totals-left'
    | 'top-strip-notes-between'
    | 'minimal-header'

type BodySectionId = 'items' | 'totals' | 'footer'

type HeaderMetaModuleId = 'receiptNumber' | 'date' | 'dueDate'
type TotalsModuleId = 'subtotal' | 'discount' | 'tax' | 'total'
type FooterModuleId = 'notes' | 'message'
type ItemsColumnId = 'description' | 'quantity' | 'price' | 'total'

type TotalsAlignment = 'right' | 'left'

interface LayoutConfig {
    headerStyle: 'classic' | 'split-header' | 'top-strip'
    bodyOrder: BodySectionId[]
    totalsAlignment: TotalsAlignment
}

const LAYOUT_PRESETS: Record<LayoutVariant, LayoutConfig> = {
    'classic': {
        headerStyle: 'classic',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'right',
    },
    'classic-totals-left': {
        headerStyle: 'classic',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'left',
    },
    'classic-notes-between': {
        headerStyle: 'classic',
        bodyOrder: ['items', 'footer', 'totals'],
        totalsAlignment: 'right',
    },
    'split-header': {
        headerStyle: 'split-header',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'right',
    },
    'split-totals-left': {
        headerStyle: 'split-header',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'left',
    },
    'split-totals-first': {
        headerStyle: 'split-header',
        bodyOrder: ['totals', 'items', 'footer'],
        totalsAlignment: 'right',
    },
    'top-strip': {
        headerStyle: 'top-strip',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'right',
    },
    'top-strip-totals-left': {
        headerStyle: 'top-strip',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'left',
    },
    'top-strip-notes-between': {
        headerStyle: 'top-strip',
        bodyOrder: ['items', 'footer', 'totals'],
        totalsAlignment: 'right',
    },
    'minimal-header': {
        headerStyle: 'classic',
        bodyOrder: ['items', 'totals', 'footer'],
        totalsAlignment: 'right',
    },
}

const DEFAULT_HEADER_META_ORDER: HeaderMetaModuleId[] = ['receiptNumber', 'date', 'dueDate']
const DEFAULT_TOTALS_ORDER: TotalsModuleId[] = ['subtotal', 'discount', 'tax', 'total']
const DEFAULT_FOOTER_ORDER: FooterModuleId[] = ['notes', 'message']
const DEFAULT_ITEMS_COLUMNS_ORDER: ItemsColumnId[] = ['description', 'quantity', 'price', 'total']

interface TemplateData {
    // Template metadata
    templateName: string
    templateDescription: string

    // Company/Sender Information
    companyName: string
    companyLogo: string
    companyEmail: string
    companyPhone: string
    companyAddress: string
    companyCity: string
    companyZip: string
    companyWebsite: string
    companyTaxId: string

    // Client/Recipient Information
    showClientInfo: boolean
    clientLabel: string

    // Receipt Metadata
    showReceiptNumber: boolean
    receiptNumberLabel: string
    showDate: boolean
    dateLabel: string
    showDueDate: boolean
    dueDateLabel: string

    // Items/Products Section
    showItems: boolean
    itemsLabel: string
    showItemDescription: boolean
    showItemQuantity: boolean
    showItemPrice: boolean
    showItemTotal: boolean

    // Totals Section
    showSubtotal: boolean
    subtotalLabel: string
    showTax: boolean
    taxLabel: string
    showTotal: boolean
    totalLabel: string
    showDiscount: boolean
    discountLabel: string

    // Footer
    footerNotes: string
    footerMessage: string

    // Styling Options
    primaryColor: string
    textColor: string
    backgroundColor: string
    fontFamily: string
    layoutVariant: LayoutVariant
    bodyOrder: BodySectionId[]
    headerMetaOrder: HeaderMetaModuleId[]
    totalsOrder: TotalsModuleId[]
    footerOrder: FooterModuleId[]
    itemsColumnsOrder: ItemsColumnId[]
}

export default function CustomTemplateBuilder({ open, onClose, onSave, isFullPage = false, isPage = false }: CustomTemplateBuilderProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'company' | 'client' | 'content' | 'layout' | 'style'>('company')

    const [data, setData] = useState<TemplateData>({
        templateName: 'Custom Receipt Template',
        templateDescription: 'My custom receipt template',

        companyName: '',
        companyLogo: '',
        companyEmail: '',
        companyPhone: '',
        companyAddress: '',
        companyCity: '',
        companyZip: '',
        companyWebsite: '',
        companyTaxId: '',

        showClientInfo: true,
        clientLabel: 'Bill To',

        showReceiptNumber: true,
        receiptNumberLabel: 'Receipt #',
        showDate: true,
        dateLabel: 'Date',
        showDueDate: false,
        dueDateLabel: 'Due Date',

        showItems: true,
        itemsLabel: 'Items',
        showItemDescription: true,
        showItemQuantity: true,
        showItemPrice: true,
        showItemTotal: true,

        showSubtotal: true,
        subtotalLabel: 'Subtotal',
        showTax: true,
        taxLabel: 'Tax',
        showTotal: true,
        totalLabel: 'Total',
        showDiscount: false,
        discountLabel: 'Discount',

        footerNotes: '',
        footerMessage: 'Thank you for your business!',

        primaryColor: '#2563eb',
        textColor: '#1f2937',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        layoutVariant: 'classic',
        bodyOrder: LAYOUT_PRESETS['classic'].bodyOrder,
        headerMetaOrder: DEFAULT_HEADER_META_ORDER,
        totalsOrder: DEFAULT_TOTALS_ORDER,
        footerOrder: DEFAULT_FOOTER_ORDER,
        itemsColumnsOrder: DEFAULT_ITEMS_COLUMNS_ORDER,
    })

    const updateData = (key: keyof TemplateData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }))
    }
    const [draggingSection, setDraggingSection] = useState<BodySectionId | null>(null)
    const [draggingHeaderMeta, setDraggingHeaderMeta] = useState<HeaderMetaModuleId | null>(null)
    const [draggingTotalsModule, setDraggingTotalsModule] = useState<TotalsModuleId | null>(null)
    const [draggingFooterModule, setDraggingFooterModule] = useState<FooterModuleId | null>(null)
    const [draggingItemsColumn, setDraggingItemsColumn] = useState<ItemsColumnId | null>(null)

    const setLayoutVariant = (variant: LayoutVariant) => {
        const config = LAYOUT_PRESETS[variant]
        setData(prev => ({
            ...prev,
            layoutVariant: variant,
            bodyOrder: [...config.bodyOrder],
        }))
    }

    const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                updateData('companyLogo', reader.result)
            }
        }
        reader.readAsDataURL(file)
    }

    const generateTemplateHTML = (): string => {
        const hasCompanyInfo = data.companyName || data.companyEmail || data.companyPhone ||
            data.companyAddress || data.companyCity || data.companyZip ||
            data.companyWebsite || data.companyTaxId

        const layoutConfig = LAYOUT_PRESETS[data.layoutVariant] ?? LAYOUT_PRESETS['classic']
        const headerStyle = layoutConfig.headerStyle

        const headerMetaOrder = data.headerMetaOrder && data.headerMetaOrder.length
            ? data.headerMetaOrder
            : DEFAULT_HEADER_META_ORDER

        const buildHeaderMetaHTML = () => {
            return headerMetaOrder
                .map(moduleId => {
                    if (moduleId === 'receiptNumber' && data.showReceiptNumber) {
                        return `
      <div class="meta-item">
        <span class="meta-label">${data.receiptNumberLabel}:</span>
        <span class="meta-value">{{RECEIPT_ID}}</span>
      </div>
      `
                    }
                    if (moduleId === 'date' && data.showDate) {
                        return `
      <div class="meta-item">
        <span class="meta-label">${data.dateLabel}:</span>
        <span class="meta-value">{{DATE}}</span>
      </div>
      `
                    }
                    if (moduleId === 'dueDate' && data.showDueDate) {
                        return `
      <div class="meta-item">
        <span class="meta-label">${data.dueDateLabel}:</span>
        <span class="meta-value">{{DUE_DATE}}</span>
      </div>
      `
                    }
                    return ''
                })
                .join('')
        }

        let headerAndClientHTML: string

        if (headerStyle === 'split-header') {
            headerAndClientHTML = `
    <!-- Header Section -->
    <div class="header header--split">
      <div class="header-left">
        <!-- Company Information -->
        ${hasCompanyInfo ? `
        <div class="company-section">
          ${data.companyLogo ? `<img src="${data.companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
          ${data.companyName ? `<div class="company-name">${data.companyName}</div>` : ''}
          <div class="company-details">
            ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ''}
            ${data.companyCity || data.companyZip ? `<p>${[data.companyCity, data.companyZip].filter(Boolean).join(', ')}</p>` : ''}
            ${data.companyEmail ? `<p>Email: ${data.companyEmail}</p>` : ''}
            ${data.companyPhone ? `<p>Phone: ${data.companyPhone}</p>` : ''}
            ${data.companyWebsite ? `<p>Web: ${data.companyWebsite}</p>` : ''}
            ${data.companyTaxId ? `<p>Tax ID: ${data.companyTaxId}</p>` : ''}
          </div>
        </div>
        ` : '<div class="company-section"></div>'}
      </div>
      <div class="header-right">
        <!-- Client Information -->
        ${data.showClientInfo ? `
        <div class="client-section client-section--compact">
          <div class="client-label">${data.clientLabel}</div>
          <div class="client-name">{{CUSTOMER_NAME}}</div>
          <div class="client-company">{{CUSTOMER_COMPANY}}</div>
          <div class="client-email">{{CUSTOMER_EMAIL}}</div>
          <div class="client-phone">{{CUSTOMER_PHONE}}</div>
          <div class="client-address">{{CUSTOMER_ADDRESS}}</div>
        </div>
        ` : ''}
        <!-- Receipt Meta Information -->
        <div class="receipt-meta receipt-meta--compact">
          <div class="receipt-title">Receipt</div>
          ${buildHeaderMetaHTML()}
        </div>
      </div>
    </div>
    `
        } else if (headerStyle === 'top-strip') {
            headerAndClientHTML = `
    <!-- Compact Receipt Strip -->
    <div class="receipt-strip">
      <div class="receipt-strip-title">Receipt</div>
      <div class="receipt-strip-meta">
        ${buildHeaderMetaHTML()}
      </div>
    </div>

    <!-- Header Section: Company & Client -->
    <div class="header header--top-layout">
      <!-- Company Information -->
      ${hasCompanyInfo ? `
      <div class="company-section">
        ${data.companyLogo ? `<img src="${data.companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
        ${data.companyName ? `<div class="company-name">${data.companyName}</div>` : ''}
        <div class="company-details">
          ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ''}
          ${data.companyCity || data.companyZip ? `<p>${[data.companyCity, data.companyZip].filter(Boolean).join(', ')}</p>` : ''}
          ${data.companyEmail ? `<p>Email: ${data.companyEmail}</p>` : ''}
          ${data.companyPhone ? `<p>Phone: ${data.companyPhone}</p>` : ''}
          ${data.companyWebsite ? `<p>Web: ${data.companyWebsite}</p>` : ''}
          ${data.companyTaxId ? `<p>Tax ID: ${data.companyTaxId}</p>` : ''}
        </div>
      </div>
      ` : '<div class="company-section"></div>'}

      <!-- Client Information -->
      ${data.showClientInfo ? `
      <div class="client-section client-section--compact">
        <div class="client-label">${data.clientLabel}</div>
        <div class="client-name">{{CUSTOMER_NAME}}</div>
        <div class="client-company">{{CUSTOMER_COMPANY}}</div>
        <div class="client-email">{{CUSTOMER_EMAIL}}</div>
        <div class="client-phone">{{CUSTOMER_PHONE}}</div>
        <div class="client-address">{{CUSTOMER_ADDRESS}}</div>
      </div>
      ` : ''}
    </div>
    `
        } else {
            headerAndClientHTML = `
    <!-- Header Section -->
    <div class="header">
      <!-- Company Information -->
      ${hasCompanyInfo ? `
      <div class="company-section">
        ${data.companyLogo ? `<img src="${data.companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
        ${data.companyName ? `<div class="company-name">${data.companyName}</div>` : ''}
        <div class="company-details">
          ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ''}
          ${data.companyCity || data.companyZip ? `<p>${[data.companyCity, data.companyZip].filter(Boolean).join(', ')}</p>` : ''}
          ${data.companyEmail ? `<p>Email: ${data.companyEmail}</p>` : ''}
          ${data.companyPhone ? `<p>Phone: ${data.companyPhone}</p>` : ''}
          ${data.companyWebsite ? `<p>Web: ${data.companyWebsite}</p>` : ''}
          ${data.companyTaxId ? `<p>Tax ID: ${data.companyTaxId}</p>` : ''}
        </div>
      </div>
      ` : '<div class="company-section"></div>'}
      
      <!-- Receipt Meta Information -->
      <div class="receipt-meta">
        <div class="receipt-title">Receipt</div>
        ${buildHeaderMetaHTML()}
      </div>
    </div>
    
    <!-- Client Information -->
    ${data.showClientInfo ? `
    <div class="client-section">
      <div class="client-label">${data.clientLabel}</div>
      <div class="client-name">{{CUSTOMER_NAME}}</div>
      <div class="client-company">{{CUSTOMER_COMPANY}}</div>
      <div class="client-email">{{CUSTOMER_EMAIL}}</div>
      <div class="client-phone">{{CUSTOMER_PHONE}}</div>
      <div class="client-address">{{CUSTOMER_ADDRESS}}</div>
    </div>
    ` : ''}
    `
        }

        // Build body sections based on layout preset
        const itemsColumnsOrder = data.itemsColumnsOrder && data.itemsColumnsOrder.length
            ? data.itemsColumnsOrder
            : DEFAULT_ITEMS_COLUMNS_ORDER

        const visibleItemsColumns = itemsColumnsOrder.filter(colId => {
            if (colId === 'description') return data.showItemDescription
            if (colId === 'quantity') return data.showItemQuantity
            if (colId === 'price') return data.showItemPrice
            if (colId === 'total') return data.showItemTotal
            return false
        })

        const itemsHeaderCellsHTML = visibleItemsColumns
            .map(colId => {
                if (colId === 'description') return '<th>Description</th>'
                if (colId === 'quantity') return '<th class="text-center">Quantity</th>'
                if (colId === 'price') return '<th class="text-right">Price</th>'
                if (colId === 'total') return '<th class="text-right">Total</th>'
                return ''
            })
            .join('')

        const itemsSectionHTML = data.showItems
            ? `
    <!-- Items Section -->
    <div class="items-section">
      ${data.itemsLabel ? `<div class="items-title">${data.itemsLabel}</div>` : ''}
      <table class="items-table">
        <thead>
          <tr>
            ${itemsHeaderCellsHTML}
          </tr>
        </thead>
        <tbody data-items-columns="${visibleItemsColumns.join(',')}">
          {{ITEMS}}
        </tbody>
      </table>
    </div>
    `
            : ''

        const totalsOrder = data.totalsOrder && data.totalsOrder.length
            ? data.totalsOrder
            : DEFAULT_TOTALS_ORDER

        const totalsRowsHTML = totalsOrder
            .map(moduleId => {
                if (moduleId === 'subtotal' && data.showSubtotal) {
                    return `
        <div class="total-row subtotal">
          <span class="total-label">${data.subtotalLabel}</span>
          <span class="total-value">{{SUBTOTAL}}</span>
        </div>
        `
                }
                if (moduleId === 'discount' && data.showDiscount) {
                    return `
        <div class="total-row discount">
          <span class="total-label">${data.discountLabel}</span>
          <span class="total-value">{{DISCOUNT}}</span>
        </div>
        `
                }
                if (moduleId === 'tax' && data.showTax) {
                    return `
        <div class="total-row tax">
          <span class="total-label">${data.taxLabel}</span>
          <span class="total-value">{{TAX}}</span>
        </div>
        `
                }
                if (moduleId === 'total' && data.showTotal) {
                    return `
        <div class="total-row final">
          <span class="total-label">${data.totalLabel}</span>
          <span class="total-value">{{TOTAL}}</span>
        </div>
        `
                }
                return ''
            })
            .join('')

        const totalsSectionHTML = `
    <!-- Totals Section -->
    <div class="totals-section${layoutConfig.totalsAlignment === 'left' ? ' totals-left' : ''}">
      <div class="totals">
        ${totalsRowsHTML}
      </div>
    </div>
    `

        const footerOrder = data.footerOrder && data.footerOrder.length
            ? data.footerOrder
            : DEFAULT_FOOTER_ORDER

        const footerModulesHTML = footerOrder
            .map(moduleId => {
                if (moduleId === 'notes' && data.footerNotes) {
                    return `
      <div class="footer-notes">
        <div class="footer-notes-title">Notes</div>
        <div class="footer-notes-content">${data.footerNotes}</div>
      </div>
      `
                }
                if (moduleId === 'message' && data.footerMessage) {
                    return `
      <div class="footer-message">${data.footerMessage}</div>
      `
                }
                return ''
            })
            .join('')

        const footerSectionHTML = `
    <!-- Footer -->
    <div class="footer">
      ${footerModulesHTML}
    </div>
    `

        const bodySectionMap: Record<BodySectionId, string> = {
            items: itemsSectionHTML,
            totals: totalsSectionHTML,
            footer: footerSectionHTML,
        }

        const orderFromState = data.bodyOrder && data.bodyOrder.length ? data.bodyOrder : layoutConfig.bodyOrder

        const bodyHTML = orderFromState
            .map(section => bodySectionMap[section])
            .join('\n')

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${data.fontFamily};
      background-color: #f5f5f5;
      padding: 20px;
      color: ${data.textColor};
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: ${data.backgroundColor};
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid ${data.primaryColor};
    }
    
    .header.header--split {
      align-items: stretch;
      gap: 32px;
    }
    
    .header.header--top-layout {
      margin-bottom: 28px;
      padding-bottom: 0;
      border-bottom: none;
      gap: 32px;
    }
    
    .header-left,
    .header-right {
      flex: 1;
    }
    
    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 16px;
    }
    
    .receipt-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding: 10px 16px;
      border-radius: 9999px;
      background-color: ${data.primaryColor}0d;
      border: 1px solid ${data.primaryColor}33;
    }
    
    .receipt-strip-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${data.primaryColor};
    }
    
    .receipt-strip-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }
    
    .company-section {
      flex: 1;
    }
    
    .company-logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: ${data.primaryColor};
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 13px;
      line-height: 1.6;
      color: #666;
    }
    
    .company-details p {
      margin: 4px 0;
    }
    
    .receipt-meta {
      text-align: right;
    }
    
    .receipt-title {
      font-size: 28px;
      font-weight: bold;
      color: ${data.primaryColor};
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .meta-item {
      margin: 6px 0;
      font-size: 14px;
    }
    
    .meta-label {
      font-weight: 600;
      color: #666;
    }
    
    .meta-value {
      color: ${data.textColor};
      font-weight: 500;
    }
    
    .client-section {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    
    .client-section.client-section--compact {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
      margin-bottom: 8px;
    }
    
    .client-section.client-section--compact .client-label,
    .client-section.client-section--compact .client-name,
    .client-section.client-section--compact .client-company,
    .client-section.client-section--compact .client-email,
    .client-section.client-section--compact .client-phone,
    .client-section.client-section--compact .client-address {
      text-align: right;
    }
    
    .client-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .client-name {
      font-size: 16px;
      font-weight: 700;
      color: ${data.textColor};
      margin-bottom: 4px;
    }
    
    .client-company {
      font-size: 14px;
      font-weight: 500;
      color: ${data.textColor};
      margin-bottom: 2px;
    }
    
    .client-email,
    .client-phone,
    .client-address {
      font-size: 14px;
      color: #666;
      margin-top: 2px;
    }
    
    .client-section > div:empty {
      display: none;
    }
    
    .items-section {
      margin-bottom: 30px;
    }
    
    .items-title {
      font-size: 16px;
      font-weight: 700;
      color: ${data.textColor};
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .items-table thead {
      background-color: ${data.primaryColor}15;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: ${data.primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid ${data.primaryColor};
    }
    
    .items-table th.text-right {
      text-align: right;
    }
    
    .items-table th.text-center {
      text-align: center;
    }
    
    .items-table td {
      padding: 14px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: ${data.textColor};
    }
    
    .items-table td.text-right {
      text-align: right;
      font-weight: 600;
    }
    
    .items-table td.text-center {
      text-align: center;
    }
    
    .item-description {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-section.totals-left {
      justify-content: flex-start;
    }
    
    .totals {
      width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      color: ${data.textColor};
    }
    
    .total-row.subtotal,
    .total-row.tax,
    .total-row.discount {
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row.final {
      font-size: 18px;
      font-weight: bold;
      color: ${data.primaryColor};
      padding-top: 15px;
      border-top: 2px solid ${data.primaryColor};
      margin-top: 10px;
    }
    
    .total-label {
      font-weight: 600;
    }
    
    .total-value {
      font-weight: 700;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-notes {
      background-color: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    
    .footer-notes-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #78350f;
      margin-bottom: 6px;
    }
    
    .footer-notes-content {
      font-size: 13px;
      color: #92400e;
      line-height: 1.6;
    }
    
    .footer-message {
      text-align: center;
      font-size: 14px;
      color: #666;
      font-style: italic;
    }
    
    @media (max-width: 640px) {
      .header.header--split,
      .header.header--top-layout {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .header-right {
        align-items: flex-start;
      }
      
      .receipt-strip {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        border-radius: 10px;
      }
      
      .receipt-strip-meta {
        flex-wrap: wrap;
      }
      
      .client-section.client-section--compact .client-label,
      .client-section.client-section--compact .client-name,
      .client-section.client-section--compact .client-company,
      .client-section.client-section--compact .client-email,
      .client-section.client-section--compact .client-phone,
      .client-section.client-section--compact .client-address {
        text-align: left;
      }
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${headerAndClientHTML}
    
    ${bodyHTML}
  </div>
</body>
</html>
    `.trim()
    }

    const handleSave = async () => {
        if (!data.templateName.trim()) {
            setError('Please enter a template name')
            return
        }

        try {
            setLoading(true)
            setError(null)

            const templateHtml = generateTemplateHTML()

            await templateService.createTemplate({
                name: data.templateName,
                description: data.templateDescription,
                template_html: templateHtml,
            })

            onClose()
            if (onSave) onSave()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template')
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'company' as const, label: 'Company Info', icon: Building2 },
        { id: 'client' as const, label: 'Client Info', icon: User },
        { id: 'content' as const, label: 'Content', icon: FileText },
        { id: 'layout' as const, label: 'Layout', icon: Package },
        { id: 'style' as const, label: 'Styling', icon: ImageIcon },
    ]

    const content = (
        <>
            {/* Main Content */}
            <div className="template-builder-content flex flex-1 overflow-hidden flex-col lg:flex-row">
                {/* Left Column - Form Inputs (40%) */}
                <div className="w-full lg:w-[40%] border-r border-gray-200 flex flex-col bg-white overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="bg-white px-4 pt-3 pb-2">
                        <div className="flex gap-2 flex-wrap md:flex-nowrap">
                                {tabs.map(tab => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={activeTab === tab.id ? 'template-builder-tab-active' : 'template-builder-tab-inactive'}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', border: 'none', cursor: 'pointer' }}
                                        >
                                            <Icon size={18} strokeWidth={2.5} />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                            {/* Company Info Tab */}
                            {activeTab === 'company' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                                            Sender / Company Information
                                        </h3>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            All fields are optional. Only filled fields will appear in the receipt.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Company Logo URL / Upload */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-logo" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <ImageIcon size={16} className="text-gray-500" />
                                                Company Logo
                                            </Label>
                                            <Input
                                                id="company-logo"
                                                value={data.companyLogo}
                                                onChange={e => updateData('companyLogo', e.target.value)}
                                                placeholder="https://example.com/logo.png"
                                                className="w-full"
                                            />
                                            <div className="flex items-center gap-3 mt-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">Paste a logo URL or upload an image. Uploaded image will be embedded into the template.</p>
                                        </div>

                                        {/* Company Name */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-name" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Building2 size={16} className="text-gray-500" />
                                                Company Name
                                            </Label>
                                            <Input
                                                id="company-name"
                                                value={data.companyName}
                                                onChange={e => updateData('companyName', e.target.value)}
                                                placeholder="e.g., Acme Corporation Inc."
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Company Email */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-email" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Mail size={16} className="text-gray-500" />
                                                Email Address
                                            </Label>
                                            <Input
                                                id="company-email"
                                                type="email"
                                                value={data.companyEmail}
                                                onChange={e => updateData('companyEmail', e.target.value)}
                                                placeholder="contact@company.com"
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Company Phone */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-phone" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Phone size={16} className="text-gray-500" />
                                                Phone Number
                                            </Label>
                                            <Input
                                                id="company-phone"
                                                type="tel"
                                                value={data.companyPhone}
                                                onChange={e => updateData('companyPhone', e.target.value)}
                                                placeholder="+1 (555) 123-4567"
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Company Address */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-address" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <MapPin size={16} className="text-gray-500" />
                                                Street Address
                                            </Label>
                                            <Input
                                                id="company-address"
                                                value={data.companyAddress}
                                                onChange={e => updateData('companyAddress', e.target.value)}
                                                placeholder="123 Business Street"
                                                className="w-full"
                                            />
                                        </div>

                                        {/* City & ZIP */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                <Label htmlFor="company-city" className="text-sm font-semibold text-gray-900">
                                                    City, State
                                                </Label>
                                                <Input
                                                    id="company-city"
                                                    value={data.companyCity}
                                                    onChange={e => updateData('companyCity', e.target.value)}
                                                    placeholder="New York, NY"
                                                    className="w-full"
                                                />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                <Label htmlFor="company-zip" className="text-sm font-semibold text-gray-900">
                                                    ZIP Code
                                                </Label>
                                                <Input
                                                    id="company-zip"
                                                    value={data.companyZip}
                                                    onChange={e => updateData('companyZip', e.target.value)}
                                                    placeholder="10001"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Company Website */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-website" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Globe size={16} className="text-gray-500" />
                                                Website
                                            </Label>
                                            <Input
                                                id="company-website"
                                                value={data.companyWebsite}
                                                onChange={e => updateData('companyWebsite', e.target.value)}
                                                placeholder="www.company.com"
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Tax ID */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label htmlFor="company-tax" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Hash size={16} className="text-gray-500" />
                                                Tax ID / EIN
                                            </Label>
                                            <Input
                                                id="company-tax"
                                                value={data.companyTaxId}
                                                onChange={e => updateData('companyTaxId', e.target.value)}
                                                placeholder="XX-XXXXXXX"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Client Info Tab */}
                            {activeTab === 'client' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                                            Client / Recipient Information
                                        </h3>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            Configure how client information (name, email, company, phone, address) appears on the receipt
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Show Client Info Toggle */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 hover:border-blue-300 transition-all">
                                            <div className="flex items-center gap-4 cursor-pointer">
                                                <Checkbox
                                                    id="show-client-info"
                                                    checked={data.showClientInfo}
                                                    onCheckedChange={checked => updateData('showClientInfo', !!checked)}
                                                />
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">
                                                        Show Client Information Section
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Display customer details on the receipt
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {data.showClientInfo && (
                                            <>
                                                {/* Client Section Label */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                    <Label htmlFor="client-label" className="text-sm font-semibold text-gray-900">
                                                        Section Label
                                                    </Label>
                                                    <Input
                                                        id="client-label"
                                                        value={data.clientLabel}
                                                        onChange={e => updateData('clientLabel', e.target.value)}
                                                        placeholder="e.g., Bill To, Client, Customer"
                                                        className="w-full"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Receipt Metadata */}
                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>Receipt Metadata</h4>

                                            {/* Receipt Number */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-receipt-number"
                                                        checked={data.showReceiptNumber}
                                                        onCheckedChange={checked => updateData('showReceiptNumber', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">
                                                            Show Receipt Number
                                                        </div>
                                                        {data.showReceiptNumber && (
                                                            <Input
                                                                value={data.receiptNumberLabel}
                                                                onChange={e => updateData('receiptNumberLabel', e.target.value)}
                                                                placeholder="Receipt #"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Date */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-date"
                                                        checked={data.showDate}
                                                        onCheckedChange={checked => updateData('showDate', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">
                                                            Show Date
                                                        </div>
                                                        {data.showDate && (
                                                            <Input
                                                                value={data.dateLabel}
                                                                onChange={e => updateData('dateLabel', e.target.value)}
                                                                placeholder="Date"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Due Date */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-due-date"
                                                        checked={data.showDueDate}
                                                        onCheckedChange={checked => updateData('showDueDate', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">
                                                            Show Due Date
                                                        </div>
                                                        {data.showDueDate && (
                                                            <Input
                                                                value={data.dueDateLabel}
                                                                onChange={e => updateData('dueDateLabel', e.target.value)}
                                                                placeholder="Due Date"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content Tab */}
                            {activeTab === 'content' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Items & Content Settings
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                            Configure products/items table and totals section
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Items Section */}
                                        <div className="template-builder-toggle">
                                            <div className="flex items-center gap-3 cursor-pointer">
                                                <Checkbox
                                                    id="show-items"
                                                    checked={data.showItems}
                                                    onCheckedChange={checked => updateData('showItems', !!checked)}
                                                />
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">
                                                        Show Items/Products Table
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Display line items with details
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {data.showItems && (
                                            <div className="template-builder-nested">
                                                {/* Items Section Label */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                    <Label className="text-sm font-semibold text-gray-900">
                                                        Items Section Title
                                                    </Label>
                                                    <Input
                                                        value={data.itemsLabel}
                                                        onChange={e => updateData('itemsLabel', e.target.value)}
                                                        placeholder="e.g., Items, Products, Services"
                                                        className="w-full"
                                                    />
                                                </div>

                                                {/* Column Toggles */}
                                                <div className="space-y-3">
                                                    <p className="text-xs font-semibold text-gray-700 uppercase">Table Columns</p>

                                                    <div className="flex items-center gap-3 cursor-pointer">
                                                        <Checkbox
                                                            id="show-item-description"
                                                            checked={data.showItemDescription}
                                                            onCheckedChange={checked => updateData('showItemDescription', !!checked)}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-sm text-gray-900">Description Column</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 cursor-pointer">
                                                        <Checkbox
                                                            id="show-item-quantity"
                                                            checked={data.showItemQuantity}
                                                            onCheckedChange={checked => updateData('showItemQuantity', !!checked)}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-sm text-gray-900">Quantity Column</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 cursor-pointer">
                                                        <Checkbox
                                                            id="show-item-price"
                                                            checked={data.showItemPrice}
                                                            onCheckedChange={checked => updateData('showItemPrice', !!checked)}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-sm text-gray-900">Unit Price Column</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 cursor-pointer">
                                                        <Checkbox
                                                            id="show-item-total"
                                                            checked={data.showItemTotal}
                                                            onCheckedChange={checked => updateData('showItemTotal', !!checked)}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-sm text-gray-900">Total Amount Column</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Totals Section */}
                                        <div className="pt-4 border-t border-gray-200">
                                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <DollarSign size={16} className="text-gray-500" />
                                                Totals Section
                                            </h4>

                                            <div className="space-y-4">
                                                {/* Subtotal */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-subtotal"
                                                        checked={data.showSubtotal}
                                                        onCheckedChange={checked => updateData('showSubtotal', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">Subtotal</div>
                                                        {data.showSubtotal && (
                                                            <Input
                                                                value={data.subtotalLabel}
                                                                onChange={e => updateData('subtotalLabel', e.target.value)}
                                                                placeholder="Subtotal"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Discount */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-discount"
                                                        checked={data.showDiscount}
                                                        onCheckedChange={checked => updateData('showDiscount', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">Discount</div>
                                                        {data.showDiscount && (
                                                            <Input
                                                                value={data.discountLabel}
                                                                onChange={e => updateData('discountLabel', e.target.value)}
                                                                placeholder="Discount"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tax */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-tax"
                                                        checked={data.showTax}
                                                        onCheckedChange={checked => updateData('showTax', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">Tax</div>
                                                        {data.showTax && (
                                                            <Input
                                                                value={data.taxLabel}
                                                                onChange={e => updateData('taxLabel', e.target.value)}
                                                                placeholder="Tax"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Total */}
                                                <div className="flex items-start gap-3 cursor-pointer">
                                                    <Checkbox
                                                        id="show-total"
                                                        checked={data.showTotal}
                                                        onCheckedChange={checked => updateData('showTotal', !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900 mb-2">Total</div>
                                                        {data.showTotal && (
                                                            <Input
                                                                value={data.totalLabel}
                                                                onChange={e => updateData('totalLabel', e.target.value)}
                                                                placeholder="Total"
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Layout Tab */}
                            {activeTab === 'layout' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-gray-900">Layout Presets</h3>

                                        <p className="text-xs text-gray-600">
                                            Choose from predefined arrangements of header, items, totals, and footer.
                                        </p>

                                        <div className="inline-flex flex-wrap gap-2 rounded-lg bg-gray-50 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('classic')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'classic'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Classic
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('classic-totals-left')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'classic-totals-left'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Classic · totals left
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('classic-notes-between')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'classic-notes-between'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Classic · notes before totals
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('split-header')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'split-header'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Split header
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('split-totals-left')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'split-totals-left'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Split · totals left
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('split-totals-first')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'split-totals-first'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Split · totals before items
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('top-strip')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'top-strip'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Top strip
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('top-strip-totals-left')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'top-strip-totals-left'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Top strip · totals left
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('top-strip-notes-between')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'top-strip-notes-between'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Top strip · notes before totals
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutVariant('minimal-header')}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                                                    data.layoutVariant === 'minimal-header'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-700 border-transparent hover:bg-gray-100'
                                                }`}
                                            >
                                                Minimal header
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-5 border-t border-gray-200 pt-4">
                                        {/* Header meta chips */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Header info order</h4>
                                            <p className="text-xs text-gray-500">
                                                Drag to reorder receipt number, date, and due date within the header area.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {(data.headerMetaOrder && data.headerMetaOrder.length ? data.headerMetaOrder : DEFAULT_HEADER_META_ORDER).map(metaId => (
                                                    <div
                                                        key={metaId}
                                                        draggable
                                                        onDragStart={() => setDraggingHeaderMeta(metaId)}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault()
                                                            if (!draggingHeaderMeta || draggingHeaderMeta === metaId) return
                                                            setData(prev => {
                                                                const base = prev.headerMetaOrder && prev.headerMetaOrder.length
                                                                    ? [...prev.headerMetaOrder]
                                                                    : [...DEFAULT_HEADER_META_ORDER]
                                                                const fromIndex = base.indexOf(draggingHeaderMeta)
                                                                const toIndex = base.indexOf(metaId)
                                                                if (fromIndex === -1 || toIndex === -1) return prev
                                                                base.splice(fromIndex, 1)
                                                                base.splice(toIndex, 0, draggingHeaderMeta)
                                                                return { ...prev, headerMetaOrder: base }
                                                            })
                                                            setDraggingHeaderMeta(null)
                                                        }}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-800 cursor-move hover:bg-gray-50"
                                                    >
                                                        <span>
                                                            {metaId === 'receiptNumber' && 'Receipt number'}
                                                            {metaId === 'date' && 'Date'}
                                                            {metaId === 'dueDate' && 'Due date'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Body section chips */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Body sections</h4>
                                            <p className="text-xs text-gray-500">
                                                Drag to change the order of items, totals, and footer. The live preview will update automatically.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {(data.bodyOrder && data.bodyOrder.length ? data.bodyOrder : LAYOUT_PRESETS[data.layoutVariant].bodyOrder).map(sectionId => (
                                                    <div
                                                        key={sectionId}
                                                        draggable
                                                        onDragStart={() => setDraggingSection(sectionId)}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault()
                                                            if (!draggingSection || draggingSection === sectionId) return
                                                            setData(prev => {
                                                                const base = prev.bodyOrder && prev.bodyOrder.length
                                                                    ? [...prev.bodyOrder]
                                                                    : [...LAYOUT_PRESETS[prev.layoutVariant].bodyOrder]
                                                                const fromIndex = base.indexOf(draggingSection)
                                                                const toIndex = base.indexOf(sectionId)
                                                                if (fromIndex === -1 || toIndex === -1) return prev
                                                                base.splice(fromIndex, 1)
                                                                base.splice(toIndex, 0, draggingSection)
                                                                return { ...prev, bodyOrder: base }
                                                            })
                                                            setDraggingSection(null)
                                                        }}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-800 cursor-move hover:bg-gray-50"
                                                    >
                                                        <span>
                                                            {sectionId === 'items' && 'Items'}
                                                            {sectionId === 'totals' && 'Totals'}
                                                            {sectionId === 'footer' && 'Footer / notes'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Items columns chips */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Items table columns</h4>
                                            <p className="text-xs text-gray-500">
                                                Drag to reorder Description, Qty, Price, and Total columns in the items table header.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {(data.itemsColumnsOrder && data.itemsColumnsOrder.length ? data.itemsColumnsOrder : DEFAULT_ITEMS_COLUMNS_ORDER).map(colId => (
                                                    <div
                                                        key={colId}
                                                        draggable
                                                        onDragStart={() => setDraggingItemsColumn(colId)}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault()
                                                            if (!draggingItemsColumn || draggingItemsColumn === colId) return
                                                            setData(prev => {
                                                                const base = prev.itemsColumnsOrder && prev.itemsColumnsOrder.length
                                                                    ? [...prev.itemsColumnsOrder]
                                                                    : [...DEFAULT_ITEMS_COLUMNS_ORDER]
                                                                const fromIndex = base.indexOf(draggingItemsColumn)
                                                                const toIndex = base.indexOf(colId)
                                                                if (fromIndex === -1 || toIndex === -1) return prev
                                                                base.splice(fromIndex, 1)
                                                                base.splice(toIndex, 0, draggingItemsColumn)
                                                                return { ...prev, itemsColumnsOrder: base }
                                                            })
                                                            setDraggingItemsColumn(null)
                                                        }}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-800 cursor-move hover:bg-gray-50"
                                                    >
                                                        <span>
                                                            {colId === 'description' && 'Description'}
                                                            {colId === 'quantity' && 'Qty'}
                                                            {colId === 'price' && 'Price'}
                                                            {colId === 'total' && 'Total'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Totals chips */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Totals rows</h4>
                                            <p className="text-xs text-gray-500">
                                                Drag to reorder subtotal, discount, tax, and total rows in the totals block.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {(data.totalsOrder && data.totalsOrder.length ? data.totalsOrder : DEFAULT_TOTALS_ORDER).map(totalsId => (
                                                    <div
                                                        key={totalsId}
                                                        draggable
                                                        onDragStart={() => setDraggingTotalsModule(totalsId)}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault()
                                                            if (!draggingTotalsModule || draggingTotalsModule === totalsId) return
                                                            setData(prev => {
                                                                const base = prev.totalsOrder && prev.totalsOrder.length
                                                                    ? [...prev.totalsOrder]
                                                                    : [...DEFAULT_TOTALS_ORDER]
                                                                const fromIndex = base.indexOf(draggingTotalsModule)
                                                                const toIndex = base.indexOf(totalsId)
                                                                if (fromIndex === -1 || toIndex === -1) return prev
                                                                base.splice(fromIndex, 1)
                                                                base.splice(toIndex, 0, draggingTotalsModule)
                                                                return { ...prev, totalsOrder: base }
                                                            })
                                                            setDraggingTotalsModule(null)
                                                        }}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-800 cursor-move hover:bg-gray-50"
                                                    >
                                                        <span>
                                                            {totalsId === 'subtotal' && 'Subtotal'}
                                                            {totalsId === 'discount' && 'Discount'}
                                                            {totalsId === 'tax' && 'Tax'}
                                                            {totalsId === 'total' && 'Total'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer chips */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Footer modules</h4>
                                            <p className="text-xs text-gray-500">
                                                Drag to reorder the notes/terms box and the thank-you message in the footer.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {(data.footerOrder && data.footerOrder.length ? data.footerOrder : DEFAULT_FOOTER_ORDER).map(footerId => (
                                                    <div
                                                        key={footerId}
                                                        draggable
                                                        onDragStart={() => setDraggingFooterModule(footerId)}
                                                        onDragOver={e => e.preventDefault()}
                                                        onDrop={e => {
                                                            e.preventDefault()
                                                            if (!draggingFooterModule || draggingFooterModule === footerId) return
                                                            setData(prev => {
                                                                const base = prev.footerOrder && prev.footerOrder.length
                                                                    ? [...prev.footerOrder]
                                                                    : [...DEFAULT_FOOTER_ORDER]
                                                                const fromIndex = base.indexOf(draggingFooterModule)
                                                                const toIndex = base.indexOf(footerId)
                                                                if (fromIndex === -1 || toIndex === -1) return prev
                                                                base.splice(fromIndex, 1)
                                                                base.splice(toIndex, 0, draggingFooterModule)
                                                                return { ...prev, footerOrder: base }
                                                            })
                                                            setDraggingFooterModule(null)
                                                        }}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-800 cursor-move hover:bg-gray-50"
                                                    >
                                                        <span>
                                                            {footerId === 'notes' && 'Notes / terms'}
                                                            {footerId === 'message' && 'Thank-you message'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Styling Tab */}
                            {activeTab === 'style' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Template Metadata */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-gray-900">Template Details</h3>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="template-name" className="text-xs font-semibold text-gray-900">
                                                    Template Name
                                                </Label>
                                                <Input
                                                    id="template-name"
                                                    value={data.templateName}
                                                    onChange={e => updateData('templateName', e.target.value)}
                                                    placeholder="e.g., Modern Receipt Layout"
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="template-description" className="text-xs font-semibold text-gray-900">
                                                    Description (optional)
                                                </Label>
                                                <Input
                                                    id="template-description"
                                                    value={data.templateDescription}
                                                    onChange={e => updateData('templateDescription', e.target.value)}
                                                    placeholder="Short description to recognize this template"
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Section */}
                                    <div className="pt-1">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3">Footer & Colors</h3>

                                        <div className="space-y-4">
                                            {/* Footer Notes */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                <Label className="text-sm font-semibold text-gray-900">
                                                    Notes / Terms
                                                </Label>
                                                <textarea
                                                    value={data.footerNotes}
                                                    onChange={e => updateData('footerNotes', e.target.value)}
                                                    placeholder="Add payment terms, notes, or special instructions..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
                                                />
                                            </div>

                                            {/* Text Color */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                <Label className="text-sm font-semibold text-gray-900">
                                                    Receipt Text Color
                                                </Label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="color"
                                                        value={data.textColor}
                                                        onChange={e => updateData('textColor', e.target.value)}
                                                        className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={data.textColor}
                                                        onChange={e => updateData('textColor', e.target.value)}
                                                        placeholder="#1f2937"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>

                                            {/* Background Color */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                <Label className="text-sm font-semibold text-gray-900">
                                                    Receipt Background Color
                                                </Label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="color"
                                                        value={data.backgroundColor}
                                                        onChange={e => updateData('backgroundColor', e.target.value)}
                                                        className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={data.backgroundColor}
                                                        onChange={e => updateData('backgroundColor', e.target.value)}
                                                        placeholder="#ffffff"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Font Settings */}
                                    <div className="pt-2 border-t border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-900 mb-4">Typography</h4>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <Label className="text-sm font-semibold text-gray-900">
                                                Font Family
                                            </Label>
                                            <select
                                                value={data.fontFamily}
                                                onChange={e => updateData('fontFamily', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            >
                                                <option value="Arial, sans-serif">Arial</option>
                                                <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                                                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                                                <option value="Georgia, serif">Georgia</option>
                                                <option value="'Courier New', monospace">Courier New</option>
                                                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Font</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-semibold text-red-900">Error</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            )}
                        </div>
                    </div>

                {/* Right Column - Live Preview */}
                <div className="template-builder-preview w-full lg:w-[65%]">
                    <div className="px-4 py-3 h-full">
                        <div className="sticky top-0 z-10 mb-3 bg-gray-50 pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
                                        <Package size={16} className="text-indigo-600" strokeWidth={2.5} />
                                        Live Preview
                                    </h3>
                                    <p className="text-xs text-gray-600">
                                        Preview updates automatically as you configure your template
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="px-4 py-1.5 text-xs md:text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={loading || !data.templateName.trim()}
                                        className="px-4 py-1.5 text-xs md:text-sm rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                                    >
                                        {loading ? 'Saving Template...' : 'Save Template'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            {/* Use an iframe with srcDoc so template CSS is isolated and doesn't override app layout */}
                            <iframe
                                title="Template preview"
                                className="w-full border-0 rounded-md bg-white"
                                style={{ height: "640px" }}
                                srcDoc={generateTemplateHTML()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

    // Render as full page or page component (not in modal)
    if (isFullPage || isPage) {
        return (
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden w-full h-full">
                {content}
            </div>
        )
    }

    // Render as modal dialog
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="template-builder-dialog max-w-[95vw] w-[1400px] bg-white h-[90vh]" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
                {content}
            </DialogContent>
        </Dialog>
    )
}



