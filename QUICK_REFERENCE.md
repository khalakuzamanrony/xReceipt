# xReceipt Quick Reference Guide

## 🚀 Getting Started

### Installation
```bash
# Install dependencies
npm install

# Install Checkbox component (if not already installed)
npm install @radix-ui/react-checkbox

# Start development server
npm run dev
```

## 📍 Navigation

### Main Pages
- **Dashboard** - Overview with statistics
- **Admin** - Manage admin accounts and permissions
- **Products** - Product catalog management
- **Categories** - Category management with hierarchy
- **Receipts** - Receipt creation and management
- **Receipt Templates** - Template management

## 🎯 Common Tasks

### Create a New Product
1. Go to **Products** page
2. Click **Add Product** button
3. Fill in:
   - Product Name (required)
   - Description (optional)
   - Price (required, positive number)
   - Category (required)
4. Click **Create Product**

### Create a Category
1. Go to **Categories** page
2. Click **Add Category** button
3. Fill in:
   - Category Name (required)
   - Parent Category (optional, for subcategories)
4. Click **Create Category**

### Create an Admin Account
1. Go to **Admin** page
2. Click **Add New Admin** button
3. Fill in:
   - Name (required)
   - Email (required, used as login)
   - Phone (optional)
   - Profile Image (optional)
4. Configure Permissions:
   - **Product Access**: View, Create, Assign products
   - **Category Access**: View, Create, Assign categories
   - **Receipt Access**: View, Create, Assign templates
   - **Template Access**: View, Create, Assign templates
5. Click **Save Admin**

### Create a Receipt Template
1. Go to **Receipt Templates** page
2. Click **Add Template** button
3. Fill in:
   - Template Name (required)
   - Description (optional)
   - Template HTML (required)
4. Click **Create Template**

## 🔐 Permission System

### Permission Hierarchy
Each permission group has a hierarchy:

**Products:**
- View Product Page (parent)
  - Create Product (child)
  - Assign Specific Products (child)

**Categories:**
- View Category (parent)
  - Create Category (child)
  - Assign Specific Categories (child)

**Receipts:**
- View Receipt (parent)
  - Create Receipt (child)
  - Assign Receipt Templates (child)

**Templates:**
- View Receipt Templates (parent)
  - Create Receipt Template (child)
  - Assign Specific Templates (child)

### How Permissions Work
1. Parent permission must be enabled first
2. Child permissions only appear when parent is enabled
3. Unchecking parent automatically clears child selections
4. Multi-select dropdowns show when assignment permission enabled

## 📊 Dashboard Statistics

The dashboard shows real-time counts for:
- **Total Admins** - Number of admin accounts
- **Total Products** - Number of products in catalog
- **Total Categories** - Number of categories
- **Total Templates** - Number of receipt templates

## 🔍 Search Features

### Product Search
- Search by product name
- Search by description
- Real-time filtering

### Template Search
- Search by template name
- Search by description
- Real-time filtering

### Receipt Search
- Search by customer name or email
- Real-time filtering

## 🛠️ Component Architecture

### UI Components (Radix UI)
- **Button** - Action buttons with variants
- **Input** - Text input fields
- **Label** - Form labels
- **Dialog** - Modal dialogs
- **Card** - Content containers
- **Checkbox** - Accessible checkboxes

### Service Layer
- **adminService** - Admin CRUD operations
- **productService** - Product CRUD operations
- **categoryService** - Category CRUD operations
- **templateService** - Template CRUD operations

## 📱 Responsive Design

All pages are responsive:
- **Mobile** (< 768px) - Single column layout
- **Tablet** (768px - 1024px) - 2 column layout
- **Desktop** (> 1024px) - 3-4 column layout

## ⚠️ Important Notes

### Before Using
1. Ensure Supabase is configured in `.env`
2. Database tables must be created
3. Storage buckets must be set up for image uploads

### Data Validation
- All required fields are marked with *
- Email fields validate email format
- Price fields only accept positive numbers
- Phone fields support various formats

### Error Handling
- All errors display in red alert boxes
- Loading states show spinners
- Confirmation dialogs prevent accidental deletion
- Network errors are caught and displayed

## 🔗 Database Tables

Required tables:
- `users` - Admin accounts
- `admin_permissions` - Permission settings
- `products` - Product catalog
- `categories` - Product categories
- `receipt_templates` - Receipt templates

## 🎨 Styling

### Color Scheme
- **Primary**: Blue (#2563eb)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Background**: Light gray (#f9fafb)

### Spacing
- Uses Tailwind CSS spacing scale
- Consistent padding and margins
- Responsive gaps between elements

## 🚨 Troubleshooting

### Page Not Loading
- Check browser console for errors
- Verify Supabase connection
- Ensure tables exist in database

### Permissions Not Working
- Verify admin permissions are saved
- Check permission hierarchy (parent must be enabled)
- Refresh page after permission changes

### Images Not Uploading
- Check storage bucket configuration
- Verify RLS policies allow uploads
- Check file size limits

### Search Not Working
- Ensure data is loaded first
- Check search term spelling
- Try clearing search and reloading

## 📞 Support Resources

- Check `IMPLEMENTATION_SUMMARY.md` for detailed feature list
- Review component source code for implementation details
- Check Supabase documentation for database setup
- Review Radix UI documentation for component usage

---

**Last Updated:** Dec 4, 2025
**Version:** 1.0.0
