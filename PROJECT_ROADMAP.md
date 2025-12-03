# xReceipt Project Roadmap

## Phase 1: Foundation (Current)
- ✅ Database schema setup
- ✅ Supabase connection
- ✅ RLS policies (public access)
- ✅ Admin creation form (basic)
- ⏳ Storage buckets (optional for now)

---

## Phase 2: Admin Management (Next Priority)

### 2.1 Admin Page - List & Create
- [ ] Admin listing table with columns:
  - Circular profile image
  - Name
  - Email
  - Edit/Delete actions
- [ ] "Add New" button to open create form
- [ ] Admin form improvements:
  - [ ] Name field (text)
  - [ ] Email field (valid email, used as login)
  - [ ] Phone field (phone format)
  - [ ] Profile image upload (optional)

### 2.2 Admin Permissions - Product Access
- [ ] Checkbox: "View Product Page"
- [ ] Checkbox: "Create Product" (only enabled if "View Product Page" checked)
- [ ] Multi-select dropdown: "Assign Products" (only shown if "View Product Page" checked)
  - Shows all available products
  - Super admin can assign multiple products to this admin
  - Selected products stored in `assigned_product_ids`

### 2.3 Admin Permissions - Category Access
- [ ] Checkbox: "View Category"
- [ ] Checkbox: "Create Category" (only enabled if "View Category" checked)
- [ ] Checkbox: "Assign Category" (only enabled if "View Category" checked)
- [ ] Multi-select dropdown: "Assign Categories" (only shown if "Assign Category" checked)
  - Shows all available categories
  - Maintains parent-child hierarchy
  - Super admin can assign multiple categories to this admin

### 2.4 Admin Permissions - Receipt Access
- [ ] Checkbox: "View Receipt"
- [ ] Checkbox: "Create Receipt" (only enabled if "View Receipt" checked)
- [ ] Checkbox: "Assign Receipt Templates" (only enabled if "View Receipt" checked)

### 2.5 Admin Permissions - Receipt Template Access
- [ ] Checkbox: "View Receipt Templates"
- [ ] Checkbox: "Create Receipt Template" (only enabled if "View Receipt Templates" checked)
- [ ] Checkbox: "Assign Template" (only enabled if "View Receipt Templates" checked)
- [ ] Multi-select dropdown: "Assign Templates" (only shown if "Assign Template" checked)
  - Shows all available receipt templates
  - Super admin can assign multiple templates to this admin

### 2.6 Admin Permissions - Save
- [ ] Save button saves all permissions to `admin_permissions` table
- [ ] Update `admin_id`, all boolean flags, and all assigned ID arrays
- [ ] Show success/error messages

---

## Phase 3: Products Management

### 3.1 Products Page - List
- [ ] Product listing with cards showing:
  - Product name
  - Price
  - Category name (small text below name)
  - Edit/Delete actions
- [ ] "Add New" button to open create form
- [ ] Search functionality

### 3.2 Products Page - Create/Edit
- [ ] Product name field (text)
- [ ] Category dropdown (multi-level with parent-child hierarchy)
  - [ ] Search in dropdown
  - [ ] Show hierarchy visually (indentation or icons)
- [ ] Price field (number, only positive values)
- [ ] Product image upload (optional)
- [ ] Save button (saves to DB)
- [ ] Cancel button

---

## Phase 4: Categories Management

### 4.1 Categories Page - List
- [ ] Category listing showing:
  - Category name
  - Child category count (small text)
  - Edit/Delete actions
- [ ] "Add New" button to open create form

### 4.2 Categories Page - Create/Edit
- [ ] Name field (text)
- [ ] Parent category dropdown (all categories, optional for root categories)
  - [ ] Search in dropdown
- [ ] Category image upload (optional)
- [ ] Save button (saves to DB)
- [ ] Cancel button

---

## Phase 5: Receipt Templates Management

### 5.1 Receipt Templates Page - List
- [ ] Template listing showing:
  - Template name
  - Description
  - Created by (admin name)
  - Edit/Delete actions
- [ ] "Add New" button to open create form

### 5.2 Receipt Templates Page - Create/Edit
- [ ] Template name field (text)
- [ ] Template description field (textarea)
- [ ] Template HTML editor (rich editor or code editor)
- [ ] Save button (saves to DB)
- [ ] Cancel button

---

## Phase 6: Receipts Management

### 6.1 Receipts Page - List
- [ ] Receipt listing showing:
  - Receipt number
  - Customer name
  - Total amount
  - Created date
  - Status (draft/completed)
  - View/Edit/Delete actions
- [ ] "Create New" button to open create form

### 6.2 Receipts Page - Create/Edit
- [ ] Select receipt template (dropdown)
- [ ] Customer name field (text)
- [ ] Customer email field (email)
- [ ] Add line items:
  - [ ] Select product (dropdown)
  - [ ] Write quantity (number field)
  - [ ] Unit price (auto-filled from product)
  - [ ] Total (auto-calculated)
  - [ ] Remove item button
- [ ] Subtotal (auto-calculated)
- [ ] Tax field (number, optional)
- [ ] Total (auto-calculated: subtotal + tax)
- [ ] Save button (saves to DB)
- [ ] Print button (generates receipt using template)
- [ ] Download button (appears after print, downloads as PNG)

### 6.3 Receipts Page - View
- [ ] Display receipt details
- [ ] Show all line items
- [ ] Display receipt using selected template
- [ ] Print button (generates receipt)
- [ ] Download button (downloads as PNG)
- [ ] Show total download count
- [ ] Back to list button

---

## Phase 7: Dashboard

### 7.1 Dashboard - Overview
- [ ] Total receipts created (count)
- [ ] Total revenue (sum of all receipt totals)
- [ ] Total products (count)
- [ ] Total categories (count)
- [ ] Recent receipts (last 10)
- [ ] Top products by sales
- [ ] Charts/graphs (optional)

---

## Phase 8: UI/UX Enhancements

### 8.1 Navigation
- [ ] Sidebar with menu items:
  - Dashboard
  - Receipts
  - Receipt Templates
  - Products
  - Categories
  - Admin (for super admin only)
- [ ] Active menu item highlighting
- [ ] Responsive mobile menu

### 8.2 Styling
- [ ] Consistent color scheme
- [ ] Loading states
- [ ] Error messages
- [ ] Success messages
- [ ] Empty states

### 8.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels
- [ ] Color contrast

---

## Phase 9: Authentication & Security

### 9.1 Authentication
- [ ] Email/password login
- [ ] Role-based access control (super_admin, admin)
- [ ] Session management
- [ ] Logout functionality

### 9.2 Security
- [ ] Enable RLS policies (production)
- [ ] Implement proper role-based policies
- [ ] Validate all inputs
- [ ] Sanitize outputs

---

## Phase 10: Testing & Deployment

### 10.1 Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

### 10.2 Deployment
- [ ] Build optimization
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Set up CI/CD

---

## Current Status

**Phase:** 1 - Foundation (In Progress)
- ✅ Database schema created
- ✅ Supabase connected
- ✅ RLS policies set (public access)
- ✅ Admin creation form basic structure
- ⏳ Storage buckets (optional)
- ⏳ Admin permissions UI

**Next:** Phase 2.1 - Complete Admin Page list and improve create form

---

## Dependencies

```
Phase 1 (Foundation)
  ↓
Phase 2 (Admin Management)
  ↓
Phase 3 (Products) + Phase 4 (Categories) [parallel]
  ↓
Phase 5 (Receipt Templates)
  ↓
Phase 6 (Receipts)
  ↓
Phase 7 (Dashboard)
  ↓
Phase 8 (UI/UX)
  ↓
Phase 9 (Auth & Security)
  ↓
Phase 10 (Testing & Deployment)
```

---

## Notes

- All forms should have validation
- All data should be saved to Supabase
- All lists should have search/filter
- All images should be optional
- All dropdowns should have search
- All multi-select dropdowns should allow multiple selections
- All permissions are conditional based on parent checkboxes
- All timestamps should be auto-generated
- All IDs should be UUIDs

