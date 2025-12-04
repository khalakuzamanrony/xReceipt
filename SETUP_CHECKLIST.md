# xReceipt Setup Checklist

## ✅ Phase 1: Environment Setup

- [ ] Create Supabase project
- [ ] Get Supabase URL and Anon Key
- [ ] Create `.env.local` file
- [ ] Add environment variables:
  ```env
  VITE_SUPABASE_URL=your_url
  VITE_SUPABASE_ANON_KEY=your_key
  ```

## ✅ Phase 2: Database Tables

Create all required tables in Supabase:

- [ ] **users** table
  - id, email, name, phone, role, profile_image_url, created_at, updated_at

- [ ] **admin_permissions** table
  - id, admin_id, product permissions, category permissions, receipt permissions, template permissions, created_at, updated_at

- [ ] **products** table
  - id, name, description, price, category_id, image_url, created_at, updated_at

- [ ] **categories** table
  - id, name, parent_id, image_url, created_at, updated_at

- [ ] **receipt_templates** table
  - id, name, description, template_html, created_by, created_at, updated_at

- [ ] **receipts** table
  - id, customer_name, customer_email, template_id, quantity, total_amount, status, created_at, updated_at

## ✅ Phase 3: Storage Buckets

Create public storage buckets:

- [ ] **admin-profiles** bucket
  - Set to public
  - Configure CORS if needed

- [ ] **category-images** bucket
  - Set to public
  - Configure CORS if needed

## ✅ Phase 4: Dependencies

- [ ] Run `npm install`
- [ ] Run `npm install @radix-ui/react-checkbox`
- [ ] Verify all dependencies installed

## ✅ Phase 5: Development Server

- [ ] Run `npm run dev`
- [ ] Server running on http://localhost:5174
- [ ] No console errors

## ✅ Phase 6: Test Database Connections

### Admin Page
- [ ] Load admin list
- [ ] Create new admin
- [ ] Edit admin
- [ ] Delete admin
- [ ] Upload profile image
- [ ] Set permissions

### Products Page
- [ ] Load product list
- [ ] Search products
- [ ] Create new product
- [ ] Edit product
- [ ] Delete product
- [ ] Select category

### Categories Page
- [ ] Load category list
- [ ] Create new category
- [ ] Edit category
- [ ] Delete category
- [ ] Set parent category
- [ ] View hierarchy

### Receipts Page
- [ ] Load receipt list
- [ ] Search receipts
- [ ] Create new receipt
- [ ] Edit receipt
- [ ] Delete receipt
- [ ] Select template
- [ ] Set quantity

### Templates Page
- [ ] Load template list
- [ ] Search templates
- [ ] Create new template
- [ ] Edit template
- [ ] Delete template
- [ ] Edit HTML

### Dashboard Page
- [ ] Load statistics
- [ ] Admin count displays
- [ ] Product count displays
- [ ] Category count displays
- [ ] Template count displays

## ✅ Phase 7: UI/Design Verification

- [ ] All modals have bright white backgrounds
- [ ] All text is readable (good contrast)
- [ ] All buttons are styled consistently
- [ ] All form inputs are visible
- [ ] All cards have consistent styling
- [ ] Checkboxes are visible and clickable
- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet
- [ ] Responsive design works on desktop

## ✅ Phase 8: Error Handling

- [ ] Test with invalid data
- [ ] Test with missing fields
- [ ] Test with network errors
- [ ] Error messages display correctly
- [ ] Loading states show properly
- [ ] Empty states display correctly

## ✅ Phase 9: Permissions Testing

- [ ] Create admin with limited permissions
- [ ] Verify permission restrictions work
- [ ] Test permission hierarchy
- [ ] Test multi-select assignments
- [ ] Verify permissions save to database

## ✅ Phase 10: Performance

- [ ] Pages load quickly
- [ ] Search is responsive
- [ ] No console warnings
- [ ] No memory leaks
- [ ] Images load properly

## ✅ Phase 11: Documentation

- [ ] Read DESIGN_SYSTEM.md
- [ ] Read DATABASE_SETUP.md
- [ ] Read DB_CONNECTION_STATUS.md
- [ ] Read IMPLEMENTATION_SUMMARY.md
- [ ] Read QUICK_REFERENCE.md

## ✅ Phase 12: Deployment Prep

- [ ] All environment variables set
- [ ] Database backups created
- [ ] RLS policies configured (if needed)
- [ ] Storage buckets secured
- [ ] Error logging configured

## 📋 Quick Test Commands

### Test in Browser Console
```javascript
// Test Supabase connection
import { supabase } from '@/lib/supabase'
const { data, error } = await supabase.from('users').select('*').limit(1)
console.log('Users:', data, error)

// Test product service
import { productService } from '@/services/productService'
const products = await productService.getAllProducts()
console.log('Products:', products)

// Test category service
import { categoryService } from '@/services/categoryService'
const categories = await categoryService.getAllCategories()
console.log('Categories:', categories)

// Test receipt service
import { receiptService } from '@/services/receiptService'
const receipts = await receiptService.getAllReceipts()
console.log('Receipts:', receipts)

// Test template service
import { templateService } from '@/services/templateService'
const templates = await templateService.getAllTemplates()
console.log('Templates:', templates)
```

## 🚨 Troubleshooting

### Issue: "Cannot find module '@radix-ui/react-checkbox'"
**Solution**: Run `npm install @radix-ui/react-checkbox`

### Issue: "Missing Supabase environment variables"
**Solution**: Create `.env.local` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Issue: "Table does not exist"
**Solution**: Create the table in Supabase using SQL from DATABASE_SETUP.md

### Issue: "Permission denied"
**Solution**: Check RLS policies or make sure you have proper permissions

### Issue: "Image upload fails"
**Solution**: Verify storage bucket exists and is public

### Issue: "Modal text not visible"
**Solution**: Already fixed - all modals have bright white backgrounds

### Issue: "Search not working"
**Solution**: Make sure data is loaded first, check search term

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Radix UI Docs**: https://www.radix-ui.com/docs
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev

## ✨ Features Checklist

### Core Features
- [x] Admin management with CRUD
- [x] Product management with CRUD
- [x] Category management with hierarchy
- [x] Receipt management with CRUD
- [x] Template management with CRUD
- [x] Dashboard with statistics
- [x] Search functionality
- [x] Permission system
- [x] Image upload support
- [x] Responsive design

### UI/UX Features
- [x] Bright, readable design
- [x] Consistent styling
- [x] Loading states
- [x] Error messages
- [x] Empty states
- [x] Confirmation dialogs
- [x] Modal dialogs
- [x] Form validation
- [x] Search bars
- [x] Status badges

### Database Features
- [x] CRUD operations
- [x] Real-time updates
- [x] Error handling
- [x] Data relationships
- [x] Timestamps
- [x] Soft deletes (optional)

## 🎯 Success Criteria

- ✅ All pages load without errors
- ✅ All CRUD operations work
- ✅ All searches work
- ✅ All permissions work
- ✅ All UI is readable and consistent
- ✅ All database connections work
- ✅ All error messages display
- ✅ Responsive on all devices

---

**Status**: Ready for Setup
**Last Updated**: Dec 4, 2025
**Version**: 1.0.0
