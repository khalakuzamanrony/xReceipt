# Receipt Templates - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Open Template Builder
```
Navigate to: Admin Panel → Templates → Click "Template Builder" Button
```

### Step 2: Choose Your Template
Select from 4 pre-designed options:
- **Minimal** - Simple & clean
- **Professional** - Business invoice
- **Modern** - Colorful & contemporary
- **Compact** - Thermal printer optimized

### Step 3: Create & Use
1. Click "Use Template"
2. Enter custom name
3. Click "Create Template"
4. Use in receipt creation

---

## 📋 Template Options at a Glance

| Template | Best For | Features |
|----------|----------|----------|
| **Minimal** | Quick receipts | Simple, lightweight |
| **Professional** | Invoices, B2B | Detailed, business-grade |
| **Modern** | E-commerce | Colorful, contemporary |
| **Compact** | POS systems | Thermal printer ready |

---

## 🎨 Customization

### Change Template Name
When creating from a preset, modify the name field to something unique.

### Customize HTML
Edit templates after creation to:
- Change colors
- Adjust fonts
- Modify layout
- Add company branding

### Use Dynamic Variables
Insert these in your HTML:
```
{{RECEIPT_ID}}      - Receipt number
{{DATE}}            - Transaction date
{{CUSTOMER_NAME}}   - Customer name
{{CUSTOMER_EMAIL}}  - Customer email
{{ITEMS}}           - Item list
{{TOTAL}}           - Total amount
{{SUBTOTAL}}        - Subtotal
{{TAX}}             - Tax amount
{{STATUS}}          - Payment status
```

---

## 📱 Template Features

✅ **Live Preview** - See how it looks before saving
✅ **HTML Editor** - Full control over design
✅ **Variable Support** - Dynamic content insertion
✅ **Responsive** - Works on all devices
✅ **Print-friendly** - Optimized for printing
✅ **Database Saved** - Persists in Supabase

---

## 💡 Pro Tips

1. **Start with Minimal** if you want simplicity
2. **Use Professional** for business invoices
3. **Try Modern** for e-commerce/retail
4. **Choose Compact** for POS/thermal printers

5. **Preview First** - Always check preview before saving
6. **Copy HTML** - Use the copy button to backup templates
7. **Test Variables** - Ensure all variables are in your data

---

## 🔧 Common Customizations

### Change Company Name
Find in HTML and replace:
```html
<p>Your Company Name</p>
```

### Change Colors
Modify in `<style>` section:
```css
color: #667eea;        /* Change to your brand color */
background: #f5f5f5;   /* Change background */
```

### Add Logo
Insert in header:
```html
<img src="your-logo-url" alt="Logo" style="max-width: 100px;">
```

---

## ❓ FAQ

**Q: Can I edit templates after creation?**
A: Yes! Click "Edit" on any template to modify HTML.

**Q: Will variables automatically populate?**
A: Yes, when you create receipts, variables are replaced with actual data.

**Q: Can I delete templates?**
A: Yes, click "Delete" on any template card.

**Q: How many templates can I create?**
A: Unlimited! Create as many as you need.

**Q: Can I share templates with team?**
A: Yes, all admins can use any created template.

---

## 🎯 Next Steps

1. ✅ Create your first template using Template Builder
2. ✅ Create a test receipt using your template
3. ✅ Customize template to match your branding
4. ✅ Share with your team

---

**Need Help?** Check `RECEIPT_TEMPLATES_GUIDE.md` for detailed documentation.
