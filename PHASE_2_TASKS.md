# Phase 2: Admin Management - Detailed Tasks

## Current Status
- ✅ Basic admin creation form exists
- ✅ Admin table in database
- ✅ Supabase connection working
- ⏳ Admin list view needs improvement
- ⏳ Admin permissions UI needs to be built

---

## Task 2.1: Admin Page - List View

### 2.1.1 Improve Admin List Table
**File:** `src/components/admin/AdminList.tsx`

- [ ] Display admin table with columns:
  - [ ] Circular profile image (placeholder if no image)
  - [ ] Name
  - [ ] Email
  - [ ] Actions (Edit, Delete buttons)
- [ ] Add loading state
- [ ] Add empty state message
- [ ] Add error handling
- [ ] Add pagination (if many admins)

### 2.1.2 Add "Add New" Button
- [ ] Button at top of admin list
- [ ] Opens AdminForm in create mode
- [ ] Closes after successful creation
- [ ] Refreshes admin list

### 2.1.3 Edit Admin
- [ ] Click Edit button opens AdminForm in edit mode
- [ ] Pre-fills form with admin data
- [ ] Updates admin in database
- [ ] Refreshes admin list

### 2.1.4 Delete Admin
- [ ] Delete button with confirmation dialog
- [ ] Deletes admin from database
- [ ] Refreshes admin list
- [ ] Shows success message

---

## Task 2.2: Admin Form - Improvements

**File:** `src/components/admin/AdminForm.tsx`

### 2.2.1 Form Fields
- [ ] Name field (text input)
  - [ ] Required validation
  - [ ] Min 2 characters
- [ ] Email field (email input)
  - [ ] Required validation
  - [ ] Valid email format
  - [ ] Unique email check
- [ ] Phone field (phone input)
  - [ ] Optional
  - [ ] Phone format validation
- [ ] Profile image upload (optional)
  - [ ] Show preview
  - [ ] Graceful error handling

### 2.2.2 Form Actions
- [ ] Save button
  - [ ] Validates all fields
  - [ ] Shows loading state
  - [ ] Shows success message
  - [ ] Closes form on success
- [ ] Cancel button
  - [ ] Closes form without saving
  - [ ] Confirms if form has changes

### 2.2.3 Form Validation
- [ ] Client-side validation
- [ ] Server-side validation
- [ ] Show field-level errors
- [ ] Disable submit if invalid

---

## Task 2.3: Admin Permissions - Product Access

**File:** `src/components/admin/permissions/ProductAccessGroup.tsx` (new)

### 2.3.1 Checkboxes
- [ ] "View Product Page" checkbox
  - [ ] Unchecked by default
  - [ ] Enables other product checkboxes when checked
- [ ] "Create Product" checkbox
  - [ ] Disabled if "View Product Page" unchecked
  - [ ] Unchecked by default
- [ ] "Assign Products" checkbox
  - [ ] Disabled if "View Product Page" unchecked
  - [ ] Unchecked by default
  - [ ] Shows multi-select dropdown when checked

### 2.3.2 Multi-Select Dropdown
- [ ] Shows all available products
- [ ] Displays product name and price
- [ ] Multiple selection allowed
- [ ] Search functionality
- [ ] Selected products stored in `assigned_product_ids`
- [ ] Only visible if "Assign Products" checked

### 2.3.3 State Management
- [ ] Track checkbox states
- [ ] Track selected product IDs
- [ ] Update parent form state
- [ ] Validate before save

---

## Task 2.4: Admin Permissions - Category Access

**File:** `src/components/admin/permissions/CategoryAccessGroup.tsx` (new)

### 2.4.1 Checkboxes
- [ ] "View Category" checkbox
  - [ ] Unchecked by default
  - [ ] Enables other category checkboxes when checked
- [ ] "Create Category" checkbox
  - [ ] Disabled if "View Category" unchecked
  - [ ] Unchecked by default
- [ ] "Assign Category" checkbox
  - [ ] Disabled if "View Category" unchecked
  - [ ] Unchecked by default
  - [ ] Shows multi-select dropdown when checked

### 2.4.2 Multi-Select Dropdown
- [ ] Shows all available categories
- [ ] Maintains parent-child hierarchy
  - [ ] Indent child categories
  - [ ] Show parent category name
- [ ] Search functionality
- [ ] Multiple selection allowed
- [ ] Selected categories stored in `assigned_category_ids`
- [ ] Only visible if "Assign Category" checked

### 2.4.3 State Management
- [ ] Track checkbox states
- [ ] Track selected category IDs
- [ ] Update parent form state
- [ ] Validate before save

---

## Task 2.5: Admin Permissions - Receipt Access

**File:** `src/components/admin/permissions/ReceiptAccessGroup.tsx` (new)

### 2.5.1 Checkboxes
- [ ] "View Receipt" checkbox
  - [ ] Unchecked by default
  - [ ] Enables other receipt checkboxes when checked
- [ ] "Create Receipt" checkbox
  - [ ] Disabled if "View Receipt" unchecked
  - [ ] Unchecked by default
- [ ] "Assign Receipt Templates" checkbox
  - [ ] Disabled if "View Receipt" unchecked
  - [ ] Unchecked by default
  - [ ] Shows multi-select dropdown when checked

### 2.5.2 Multi-Select Dropdown
- [ ] Shows all available receipt templates
- [ ] Multiple selection allowed
- [ ] Search functionality
- [ ] Selected templates stored in `assigned_template_ids`
- [ ] Only visible if "Assign Receipt Templates" checked

### 2.5.3 State Management
- [ ] Track checkbox states
- [ ] Track selected template IDs
- [ ] Update parent form state
- [ ] Validate before save

---

## Task 2.6: Admin Permissions - Receipt Template Access

**File:** `src/components/admin/permissions/TemplateAccessGroup.tsx` (new)

### 2.6.1 Checkboxes
- [ ] "View Receipt Templates" checkbox
  - [ ] Unchecked by default
  - [ ] Enables other template checkboxes when checked
- [ ] "Create Receipt Template" checkbox
  - [ ] Disabled if "View Receipt Templates" unchecked
  - [ ] Unchecked by default
- [ ] "Assign Template" checkbox
  - [ ] Disabled if "View Receipt Templates" unchecked
  - [ ] Unchecked by default
  - [ ] Shows multi-select dropdown when checked

### 2.6.2 Multi-Select Dropdown
- [ ] Shows all available receipt templates
- [ ] Multiple selection allowed
- [ ] Search functionality
- [ ] Selected templates stored in `assigned_template_ids`
- [ ] Only visible if "Assign Template" checked

### 2.6.3 State Management
- [ ] Track checkbox states
- [ ] Track selected template IDs
- [ ] Update parent form state
- [ ] Validate before save

---

## Task 2.7: Admin Permissions - Save

**File:** `src/services/adminService.ts`

### 2.7.1 Save Permissions Function
- [ ] Function: `saveAdminPermissions(adminId, permissions)`
- [ ] Saves to `admin_permissions` table
- [ ] Updates all boolean flags
- [ ] Updates all assigned ID arrays
- [ ] Handles errors gracefully
- [ ] Returns saved permissions

### 2.7.2 Update Permissions Function
- [ ] Function: `updateAdminPermissions(adminId, permissions)`
- [ ] Updates existing permissions
- [ ] Validates data before save
- [ ] Handles errors gracefully
- [ ] Returns updated permissions

### 2.7.3 Get Permissions Function
- [ ] Function: `getAdminPermissions(adminId)`
- [ ] Fetches permissions from database
- [ ] Returns null if not found
- [ ] Handles errors gracefully

---

## Task 2.8: Admin Form - Integrate Permissions

**File:** `src/components/admin/AdminForm.tsx`

### 2.8.1 Add Permission Groups
- [ ] Import all permission components
- [ ] Add ProductAccessGroup
- [ ] Add CategoryAccessGroup
- [ ] Add ReceiptAccessGroup
- [ ] Add TemplateAccessGroup

### 2.8.2 Form Layout
- [ ] Basic Information section
- [ ] Permissions section with tabs or accordions
  - [ ] Product Access tab
  - [ ] Category Access tab
  - [ ] Receipt Access tab
  - [ ] Template Access tab

### 2.8.3 Form Submission
- [ ] Collect all permission data
- [ ] Validate permissions
- [ ] Save admin
- [ ] Save permissions
- [ ] Show success message
- [ ] Close form

### 2.8.4 Form Loading
- [ ] Load existing admin data
- [ ] Load existing permissions
- [ ] Pre-fill form fields
- [ ] Pre-select checkboxes
- [ ] Pre-select dropdown values

---

## Implementation Order

1. **2.1.1** - Improve admin list table
2. **2.1.2** - Add "Add New" button
3. **2.2.1** - Improve form fields
4. **2.2.2** - Add form actions
5. **2.2.3** - Add form validation
6. **2.3** - Product access permissions
7. **2.4** - Category access permissions
8. **2.5** - Receipt access permissions
9. **2.6** - Template access permissions
10. **2.7** - Save permissions to database
11. **2.8** - Integrate permissions into form
12. **2.1.3** - Edit admin functionality
13. **2.1.4** - Delete admin functionality

---

## Testing Checklist

- [ ] Create new admin with all permissions
- [ ] Edit existing admin permissions
- [ ] Delete admin
- [ ] Verify permissions saved to database
- [ ] Verify conditional checkboxes work
- [ ] Verify multi-select dropdowns work
- [ ] Verify search in dropdowns works
- [ ] Verify form validation works
- [ ] Verify error handling works
- [ ] Test on mobile/tablet
- [ ] Test accessibility (keyboard, screen reader)

---

## Notes

- All permission changes should be reflected immediately
- All dropdowns should have search
- All multi-select should allow clear selection
- All forms should show loading state during save
- All errors should be user-friendly
- All success messages should be clear

