# Receipt Template Examples

## Overview
This document shows the 4 pre-built receipt templates available in the Template Builder.

---

## 1. Minimal Receipt Template

**Best For:** Quick transactions, simple receipts, small businesses

**Features:**
- Clean, simple design
- Lightweight HTML
- Easy to customize
- Fast loading

**Key Elements:**
- Centered header with "RECEIPT" title
- Receipt number
- Item list with prices
- Total amount
- Footer message

**Use Case:** Perfect for a coffee shop, retail store, or any business needing quick, simple receipts.

---

## 2. Professional Receipt Template

**Best For:** Business invoices, B2B transactions, professional services

**Features:**
- Business-grade formatting
- Company information section
- Detailed item table
- Tax calculation
- Professional styling

**Key Elements:**
- Company header with logo space
- Invoice number and date
- Bill-to customer section
- Itemized table with columns
- Subtotal, Tax, Total breakdown
- Payment status
- Footer with contact info

**Use Case:** Ideal for consultants, agencies, or any business needing professional invoices.

---

## 3. Modern Receipt Template

**Best For:** E-commerce, retail, modern businesses

**Features:**
- Contemporary design
- Gradient styling
- Mobile-friendly
- Colorful layout
- Modern typography

**Key Elements:**
- Gradient header with checkmark
- Receipt ID and date
- Customer information
- Item list with modern styling
- Totals section with breakdown
- Thank you message
- Responsive design

**Use Case:** Perfect for online stores, modern retail, or any business wanting a contemporary look.

---

## 4. Compact Receipt Template

**Best For:** POS systems, thermal printers, compact receipts

**Features:**
- Monospace font for alignment
- Minimal spacing
- Thermal printer optimized
- Compact layout
- ASCII-friendly

**Key Elements:**
- Company name header
- Receipt number and date
- Customer name
- Item list (compact format)
- Subtotal, Tax, Total
- Thank you message
- Footer text

**Use Case:** Ideal for point-of-sale systems, thermal receipt printers, or any business needing compact receipts.

---

## Template Variables Reference

All templates support these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{RECEIPT_ID}}` | Unique receipt identifier | REC-2024-001 |
| `{{DATE}}` | Transaction date | December 4, 2024 |
| `{{CUSTOMER_NAME}}` | Customer's full name | John Doe |
| `{{CUSTOMER_EMAIL}}` | Customer's email | john@example.com |
| `{{ITEMS}}` | List of purchased items | Item 1 - $10.00 |
| `{{TOTAL}}` | Total amount | $100.00 |
| `{{SUBTOTAL}}` | Subtotal before tax | $95.24 |
| `{{TAX}}` | Tax amount | $4.76 |
| `{{STATUS}}` | Payment status | Paid/Draft/Sent |
| `{{COMPANY_NAME}}` | Your company name | Acme Corp |
| `{{COMPANY_EMAIL}}` | Your company email | info@acme.com |
| `{{FOOTER_MESSAGE}}` | Custom footer text | Thank you! |

---

## Customization Examples

### Example 1: Change Company Name in Professional Template
**Original:**
```html
<h1>INVOICE</h1>
<p>Your Company Name</p>
```

**Modified:**
```html
<h1>INVOICE</h1>
<p>Acme Corporation</p>
```

### Example 2: Change Colors in Modern Template
**Original:**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: #667eea;
```

**Modified:**
```css
background: linear-gradient(135deg, #FF6B6B 0%, #FF8E72 100%);
color: #FF6B6B;
```

### Example 3: Add Logo to Professional Template
**Add after company name:**
```html
<img src="https://your-domain.com/logo.png" alt="Company Logo" style="max-width: 100px; margin-bottom: 10px;">
```

### Example 4: Customize Footer in Minimal Template
**Original:**
```html
<p>Thank you for your business!</p>
```

**Modified:**
```html
<p>Thank you for your purchase!</p>
<p>Visit us again: www.yoursite.com</p>
```

---

## Styling Tips

### Font Customization
```css
/* Change font family */
body { font-family: 'Georgia', serif; }

/* Change font size */
h1 { font-size: 32px; }

/* Change font weight */
strong { font-weight: 700; }
```

### Color Customization
```css
/* Primary color */
.header { background: #3498db; }

/* Text color */
.text { color: #2c3e50; }

/* Border color */
.divider { border-color: #ecf0f1; }
```

### Spacing Customization
```css
/* Padding */
.container { padding: 30px; }

/* Margin */
.section { margin-bottom: 20px; }

/* Gap between items */
.items { gap: 10px; }
```

### Print Styling
```css
@media print {
  body { margin: 0; padding: 0; }
  .no-print { display: none; }
  .print-only { display: block; }
}
```

---

## Best Practices

### ✅ DO:
- Use semantic HTML structure
- Include all necessary variables
- Test with sample data
- Keep file size reasonable
- Use inline CSS
- Test print preview
- Document custom variables

### ❌ DON'T:
- Use external stylesheets
- Include JavaScript
- Use very large images
- Hardcode customer data
- Use unsupported fonts
- Forget to test variables
- Overcomplicate the design

---

## Testing Your Template

1. **Create Template** - Use Template Builder
2. **Preview** - Check the preview before saving
3. **Create Receipt** - Make a test receipt with your template
4. **Review** - Check how variables are populated
5. **Print** - Test print preview
6. **Adjust** - Edit if needed

---

## Advanced Customization

### Conditional Styling
```css
/* Different styles for different statuses */
.status-paid { color: green; }
.status-draft { color: orange; }
.status-sent { color: blue; }
```

### Responsive Design
```css
@media (max-width: 600px) {
  .container { padding: 15px; }
  .item { flex-direction: column; }
}
```

### Print-Friendly Design
```css
@media print {
  body { background: white; }
  .no-print { display: none; }
  a { text-decoration: none; }
}
```

---

## Support & Resources

- **Quick Start:** See `TEMPLATES_QUICK_START.md`
- **Full Guide:** See `RECEIPT_TEMPLATES_GUIDE.md`
- **Template Builder:** Navigate to Templates → Template Builder
- **Edit Templates:** Click "Edit" on any template card

---

**Ready to create your first template?** 🚀
Start with the Template Builder and choose a preset that matches your needs!
