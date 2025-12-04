# Receipt Template System Guide

## Overview
I've created a comprehensive receipt template system for xReceipt with pre-designed templates and a template builder interface.

## What's New

### 1. **ReceiptTemplateBuilder Component**
Location: `src/components/templates/ReceiptTemplateBuilder.tsx`

A new component that provides:
- **4 Pre-designed Receipt Templates** ready to use
- **Live Preview** functionality for each template
- **Easy Template Creation** with customizable names and descriptions
- **Template Variables** for dynamic content insertion

### 2. **Pre-built Templates**

#### **Minimal Receipt**
- Clean and simple design
- Perfect for basic transactions
- Lightweight HTML structure
- Best for: Small businesses, quick receipts

#### **Professional Receipt**
- Business-grade invoice template
- Detailed formatting with company info
- Table-based item layout
- Best for: Professional invoicing, B2B transactions

#### **Modern Receipt**
- Contemporary colorful design
- Gradient headers and modern styling
- Mobile-friendly layout
- Best for: E-commerce, modern businesses

#### **Compact Receipt**
- Optimized for thermal/POS printers
- Monospace font for alignment
- Minimal spacing
- Best for: Point of sale systems, thermal printers

## Available Template Variables

All templates support these dynamic variables:

```
{{RECEIPT_ID}}      - Unique receipt identifier
{{DATE}}            - Transaction date
{{CUSTOMER_NAME}}   - Customer's full name
{{CUSTOMER_EMAIL}}  - Customer's email address
{{ITEMS}}           - List of purchased items
{{TOTAL}}           - Total amount
{{SUBTOTAL}}        - Subtotal before tax
{{TAX}}             - Tax amount
{{STATUS}}          - Payment status (draft/sent/paid)
{{COMPANY_NAME}}    - Your company name
{{COMPANY_EMAIL}}   - Your company email
{{FOOTER_MESSAGE}}  - Custom footer text
```

## How to Use

### Step 1: Navigate to Templates
- Go to the "Templates" section in the sidebar
- Click the "Template Builder" button

### Step 2: Choose a Template
- Browse the 4 pre-designed templates
- Click "Preview" to see how it looks
- Click "Use Template" to customize it

### Step 3: Customize
- Enter a custom name for your template
- Add a description (optional)
- The HTML is pre-filled and ready to use
- Click "Create Template" to save

### Step 4: Use in Receipts
- When creating receipts, select your template
- The variables will be automatically replaced with actual data
- Preview and send to customers

## Integration with Existing System

The template builder integrates seamlessly with:
- **TemplateList Component** - Added "Template Builder" button
- **Template Service** - Uses existing `templateService.createTemplate()`
- **Database** - Saves to `receipt_templates` table
- **Receipt Creation** - Templates available when creating receipts

## Customization Tips

### Modifying Template HTML
1. Edit a template to view its HTML
2. Common customizations:
   - Change colors in `<style>` section
   - Adjust fonts and sizes
   - Modify layout structure
   - Add company logo/branding

### Adding Custom Variables
1. Use `{{VARIABLE_NAME}}` format
2. Document in your template description
3. Ensure your receipt data includes these fields

### Styling Guidelines
- Use inline CSS in `<style>` tags
- Keep responsive design in mind
- Test with different screen sizes
- Consider print-friendly styling

## File Structure

```
src/components/templates/
├── TemplateList.tsx                 (Updated - added builder button)
├── ReceiptTemplateBuilder.tsx       (New - template builder component)
└── [other template files]
```

## Features

✅ **4 Pre-designed Templates** - Ready to use immediately
✅ **Live Preview** - See how templates look before saving
✅ **Easy Customization** - Change names and descriptions
✅ **Variable Support** - Dynamic content insertion
✅ **HTML Editor** - Full control over template design
✅ **Responsive Design** - Works on all devices
✅ **Database Integration** - Saves to Supabase automatically
✅ **User-friendly UI** - Intuitive template selection

## Next Steps

1. **Create Your First Template** - Use Template Builder
2. **Test with Receipts** - Create a test receipt using your template
3. **Customize Further** - Edit templates to match your branding
4. **Share with Team** - All admins can use created templates

## Troubleshooting

### Template Not Saving
- Check that template name is filled in
- Verify HTML is valid
- Check browser console for errors

### Variables Not Replacing
- Ensure variable names match exactly (case-sensitive)
- Use `{{VARIABLE_NAME}}` format
- Check receipt data includes the variable

### Styling Issues
- Test in different browsers
- Check CSS syntax in HTML
- Use inline styles for better compatibility
- Avoid external stylesheets

## Support

For issues or questions:
1. Check the template HTML for syntax errors
2. Verify variable names in your receipt data
3. Test template preview before saving
4. Review browser console for error messages
