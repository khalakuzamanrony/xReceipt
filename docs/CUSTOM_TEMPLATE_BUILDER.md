# Custom Template Builder - Feature Documentation

## Overview
The **Custom Template Builder** is a powerful new feature that allows users to create fully customizable receipt templates from scratch. This feature provides complete control over every aspect of the receipt, from company branding to layout and styling.

## Key Features

### 🎨 **Complete Customization**
- **All fields are optional** - Only filled fields appear in the final receipt
- **Auto-arrangement** - Modules automatically adjust based on user input
- **Live Preview** - See changes in real-time as you configure
- **Professional Design** - Clean, modern design with proper spacing

### 📋 **What You Can Customize**

#### 1. **Company/Sender Information**
- Company Logo (URL)
- Company Name
- Email Address
- Phone Number
- Street Address
- City, State, ZIP Code
- Website
- Tax ID / EIN

#### 2. **Client/Recipient Information**
- Toggle to show/hide client section
- Customizable section label (e.g., "Bill To", "Client", "Customer")
- Client name and email placeholders

#### 3. **Receipt Metadata**
- Receipt Number (with custom label)
- Date (with custom label)
- Due Date (with custom label)
- Each field can be toggled on/off independently

#### 4. **Items/Products Section**
- Toggle entire items table
- Custom section title
- Choose which columns to display:
  - Description
  - Quantity
  - Unit Price
  - Total Amount

#### 5. **Totals Section**
Customize which totals to display and their labels:
- Subtotal
- Discount
- Tax
- Total (Grand Total)

#### 6. **Footer Content**
- Custom notes/terms section
- Thank you message

#### 7. **Styling Options**
- Primary/Accent Color (brand color)
- Text Color
- Background Color
- Font Family (6 professional fonts to choose from)

## User Interface

### Layout
The Custom Template Builder features a **split-screen design**:

- **Left Panel (40%)**: Form inputs organized in tabs
  - Company Info
  - Client Info
  - Content Settings
  - Styling Options

- **Right Panel (60%)**: Live preview
  - Updates automatically as you configure
  - Shows exactly how the receipt will look
  - Responsive and scrollable

### Tab Organization

#### 📦 Company Info Tab
All sender/company related fields with icons for easy identification.

#### 👤 Client Info Tab
Client section settings and receipt metadata (receipt number, dates).

#### 📝 Content Tab
Items table configuration, totals section, and footer content.

#### 🎨 Style Tab
Template name, description, and visual styling options.

## How to Use

### Access the Builder
1. Navigate to the **Templates** page
2. Click the **Create** dropdown button
3. Select **✨ Custom Builder** (first option)

### Configure Your Template

#### Step 1: Add Company Information
1. Go to the **Company Info** tab
2. Fill in your company details (all optional):
   - Add logo URL if you have one
   - Enter company name
   - Add contact information
   - Include address if needed
   - Add website and Tax ID as required

#### Step 2: Configure Client Section
1. Go to the **Client Info** tab
2. Toggle client information display on/off
3. Customize the section label
4. Configure receipt metadata:
   - Enable/disable receipt number
   - Enable/disable date fields
   - Customize labels for each field

#### Step 3: Set Up Content
1. Go to the **Content** tab
2. Configure items table:
   - Toggle items section on/off
   - Set custom title for items section
   - Choose which columns to show
3. Set up totals:
   - Enable/disable each total line
   - Customize labels
4. Add footer content:
   - Add notes or terms
   - Set thank you message

#### Step 4: Style Your Template
1. Go to the **Style** tab
2. Enter template name (required)
3. Add description (optional)
4. Choose colors:
   - Pick primary/brand color
   - Set text color
   - Choose background color
5. Select font family

#### Step 5: Save
1. Review the live preview
2. Click **Save Template** button
3. Template is now available for creating receipts

## Technical Details

### Smart Auto-Arrangement
The template intelligently handles optional fields:

```html
<!-- Company section only renders if fields are filled -->
${hasCompanyInfo ? `
  <div class="company-section">
    ${data.companyLogo ? `<img src="${data.companyLogo}" />` : ''}
    ${data.companyName ? `<div>${data.companyName}</div>` : ''}
    ...
  </div>
` : ''}
```

This ensures:
- No empty sections in the receipt
- Clean, professional appearance
- Automatic layout adjustments
- Balanced spacing

### Data Placeholders
The template uses placeholders that get replaced with actual data:

- `{{RECEIPT_ID}}` - Receipt number
- `{{DATE}}` - Receipt date
- `{{DUE_DATE}}` - Due date
- `{{CUSTOMER_NAME}}` - Client name
- `{{CUSTOMER_EMAIL}}` - Client email
- `{{ITEMS}}` - Product line items
- `{{SUBTOTAL}}` - Subtotal amount
- `{{TAX}}` - Tax amount
- `{{DISCOUNT}}` - Discount amount
- `{{TOTAL}}` - Total amount

### Responsive Design
The generated template includes:
- Mobile-friendly layout
- Print-optimized styles
- Proper spacing and margins
- Professional typography
- Consistent color scheme

## Integration with Existing System

The Custom Template Builder seamlessly integrates with the xReceipt system:

1. **Storage**: Templates are saved to Supabase database
2. **Reusability**: Saved templates can be used for any receipt
3. **Management**: Edit or delete templates from the template list
4. **Preview**: View template before using it for receipts
5. **Flexibility**: Create multiple templates for different use cases

## Use Cases

### Example 1: Basic Receipt
- Company name only
- Items table with description and total
- Simple total
- Thank you message

### Example 2: Professional Invoice
- Full company branding (logo, address, contact)
- Client information
- Receipt number and dates
- Detailed items with all columns
- Subtotal, tax, and total
- Notes with payment terms

### Example 3: Minimalist Receipt
- Company name
- Items with quantity and price
- Total only
- No footer

## Best Practices

1. **Start Simple**: Begin with basic information, add more as needed
2. **Brand Consistency**: Use your brand colors and fonts
3. **Test Preview**: Always check the live preview before saving
4. **Descriptive Names**: Use clear template names for easy identification
5. **Multiple Templates**: Create different templates for different purposes

## Troubleshooting

### Preview Not Updating
- Ensure you're typing in the correct tab
- Check that the field is enabled (toggled on)

### Missing Fields in Receipt
- Only filled fields appear in the final receipt
- Check that the section is toggled on (for optional sections)

### Color Not Applying
- Ensure the color is in valid hex format (#RRGGBB)
- Try using the color picker for accurate colors

## Future Enhancements

Potential improvements for future versions:
- Image upload for logos (instead of URL)
- More font options
- Advanced layout options
- Template duplication
- Template preview with sample data
- Export/import templates

---

## Developer Notes

### Component Location
`src/components/templates/CustomTemplateBuilder.tsx`

### Dependencies
- React (useState hook)
- Radix UI (Dialog component)
- Lucide React (Icons)
- Tailwind CSS (Styling)

### State Management
All template configuration is stored in a single `data` state object of type `TemplateData`.

### HTML Generation
The `generateTemplateHTML()` function creates a complete HTML document with:
- Embedded CSS styles
- Conditional rendering of sections
- Placeholder tokens for dynamic data
- Print-optimized media queries

---

**Created**: December 2025  
**Version**: 1.0.0  
**Status**: Production Ready
