# xReceipt - Project Checklist

## Project Overview
Multi-user receipt management system for pet toy online shop with Super Admin and Admin roles.

---

## DATABASE SCHEMA

### Tables to Create in Supabase

- [ ] `users` - User accounts (super_admin, admin)
- [ ] `products` - Product catalog
- [ ] `categories` - Product categories
- [ ] `receipt_templates` - Receipt design templates
- [ ] `receipts` - Generated receipts
- [ ] `admin_permissions` - Admin access control
- [ ] `admin_product_access` - Products assigned to admins
- [ ] `admin_category_access` - Categories assigned to admins
- [ ] `admin_template_access` - Templates assigned to admins

---

## SUPER ADMIN PAGES

### 1. Dashboard
- [ ] Overview statistics
- [ ] Recent activities
- [ ] Quick actions

### 2. Admin Management Page
- [ ] **Listing Section**
  - [ ] Table with columns: Image, Name, Email
  - [ ] "Add New" button
  - [ ] Edit/Delete actions per admin
  - [ ] Search/Filter functionality

- [ ] **Create/Edit Admin Modal**
  - [ ] Name field (text)
  - [ ] Email field (valid email, used for login)
  - [ ] Phone field (phone number)
  - [ ] Upload profile image (store in Supabase Storage)
  
  - [ ] **Product Access Group**
    - [ ] Checkbox: "View Product Page"
    - [ ] Checkbox: "Create Product" (conditional - only if View is checked)
    - [ ] Multi-select dropdown: "Assign Products" (conditional - only if View is checked)
  
  - [ ] **Category Access Group**
    - [ ] Checkbox: "View Category"
    - [ ] Checkbox: "Create Category"
    - [ ] Checkbox: "Assign Category"
    - [ ] Multi-select dropdown: "Assign Categories" (conditional - if Assign is checked)
  
  - [ ] **Receipt Access Group**
    - [ ] Checkbox: "View Receipt"
    - [ ] Checkbox: "Create Template"
    - [ ] Checkbox: "Assign Template"
    - [ ] Multi-select dropdown: "Assign Templates" (conditional - if Assign is checked)
  
  - [ ] **Receipt Template Access Group**
    - [ ] Checkbox: "View Receipt Templates"
    - [ ] Checkbox: "Create Receipt Template"
    - [ ] Checkbox: "Assign Template"
    - [ ] Multi-select dropdown: "Assign Templates" (conditional - if Assign is checked)
  
  - [ ] Save button (saves to Supabase)
  - [ ] Cancel button

### 3. Products Page
- [ ] Product listing table
- [ ] Add new product button
- [ ] Edit product
- [ ] Delete product
- [ ] Product form (name, description, price, category, image)

### 4. Categories Page
- [ ] Category listing table
- [ ] Add new category button
- [ ] Edit category
- [ ] Delete category
- [ ] Category form (name, image upload)

### 5. Receipt Templates Page
- [ ] Template listing table
- [ ] Add new template button
- [ ] Edit template
- [ ] Delete template
- [ ] Template designer/editor

### 6. Receipts Page
- [ ] Receipt listing table
- [ ] Create new receipt button
- [ ] View receipt details
- [ ] Print receipt
- [ ] Download as PDF
- [ ] Download as PNG
- [ ] Delete receipt

---

## ADMIN PAGES

### 1. Dashboard
- [ ] Overview of assigned products
- [ ] Recent receipts created
- [ ] Quick actions

### 2. Create Receipt Page
- [ ] **Receipt Template Selection**
  - [ ] Dropdown showing only assigned templates
  - [ ] Template preview
  
- [ ] **Product Selection**
  - [ ] Multi-select dropdown showing only assigned products
  - [ ] Quantity input for each selected product
  - [ ] Real-time total calculation
  
- [ ] **Receipt Details**
  - [ ] Customer name (optional)
  - [ ] Customer email (optional)
  - [ ] Notes field (optional)
  - [ ] Auto-generated receipt number
  
- [ ] **Actions**
  - [ ] Preview receipt
  - [ ] Print receipt
  - [ ] Save receipt to database
  - [ ] Download as PDF
  - [ ] Download as PNG

### 3. Receipt History Page
- [ ] Listing of created receipts
- [ ] Filter by date
- [ ] Search by receipt number
- [ ] View receipt details
- [ ] Reprint receipt
- [ ] Download receipt

---

## AUTHENTICATION & AUTHORIZATION

- [ ] Login page
- [ ] Role-based access control (RBAC)
- [ ] Super Admin role
- [ ] Admin role
- [ ] Permission checking middleware
- [ ] Logout functionality
- [ ] Session management

---

## COMPONENTS TO BUILD

### Shared Components
- [ ] Navbar/Header
- [ ] Sidebar navigation
- [ ] Button component (Radix UI)
- [ ] Input component (Radix UI)
- [ ] Select/Dropdown component (Radix UI)
- [ ] Modal/Dialog component (Radix UI)
- [ ] Table component
- [ ] Toast notifications (Radix UI)
- [ ] Loading spinner
- [ ] Error boundary

### Admin Management Components
- [ ] AdminList
- [ ] AdminForm
- [ ] PermissionGroup
- [ ] ProductAccessGroup
- [ ] CategoryAccessGroup
- [ ] ReceiptAccessGroup
- [ ] TemplateAccessGroup

### Product Components
- [ ] ProductList
- [ ] ProductForm
- [ ] ProductCard

### Category Components
- [ ] CategoryList
- [ ] CategoryForm

### Receipt Components
- [ ] ReceiptForm
- [ ] ReceiptPreview
- [ ] ReceiptList
- [ ] TemplateSelector
- [ ] ProductSelector

### Template Components
- [ ] TemplateList
- [ ] TemplateEditor
- [ ] TemplatePreview

---

## UTILITIES & SERVICES

- [ ] Supabase client setup
- [ ] Authentication service
- [ ] Admin service (CRUD)
- [ ] Product service (CRUD)
- [ ] Category service (CRUD)
- [ ] Receipt service (CRUD)
- [ ] Template service (CRUD)
- [ ] Permission checking utility
- [ ] PDF generation utility
- [ ] Image export utility
- [ ] File upload to Supabase Storage

---

## FEATURES

### Image Handling
- [ ] Upload admin profile image
- [ ] Upload category image
- [ ] Store images in Supabase Storage
- [ ] Display circular images in tables
- [ ] Image validation

### Receipt Generation
- [ ] Create receipt from template
- [ ] Calculate totals and tax
- [ ] Generate receipt number
- [ ] Store receipt data

### Export Functionality
- [ ] Download receipt as PDF
- [ ] Download receipt as PNG
- [ ] Print receipt

### Permissions
- [ ] Product view/create/assign
- [ ] Category view/create/assign
- [ ] Receipt view/create/assign
- [ ] Template view/create/assign
- [ ] Conditional UI based on permissions

---

## STYLING & UI

- [ ] Tailwind CSS configuration
- [ ] Radix UI components integration
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support (optional)
- [ ] Consistent color scheme
- [ ] Form validation styling
- [ ] Error messages
- [ ] Success messages

---

## TESTING

- [ ] Unit tests for services
- [ ] Component tests
- [ ] Integration tests
- [ ] Permission logic tests

---

## DEPLOYMENT

- [ ] Build optimization
- [ ] PWA configuration
- [ ] Service Worker setup
- [ ] Deployment to production

---

## CURRENT STATUS

- [x] Project setup (React, TypeScript, Tailwind, Radix UI, Supabase)
- [ ] Database schema creation
- [ ] Authentication system
- [ ] Admin management page (IN PROGRESS)
- [ ] Remaining pages and components

