# Database Setup & Connection Guide

## ✅ Database Connection Status

### Connected Pages
- ✅ **Admin** - Full CRUD with permissions
- ✅ **Products** - Full CRUD with search
- ✅ **Categories** - Full CRUD with hierarchy
- ✅ **Receipts** - Full CRUD with status tracking
- ✅ **Receipt Templates** - Full CRUD with HTML editor
- ✅ **Dashboard** - Real-time statistics

## 📋 Required Database Tables

### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. admin_permissions
```sql
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product permissions
  can_view_products BOOLEAN DEFAULT false,
  can_create_products BOOLEAN DEFAULT false,
  assigned_product_ids TEXT[] DEFAULT '{}',
  
  -- Category permissions
  can_view_categories BOOLEAN DEFAULT false,
  can_create_categories BOOLEAN DEFAULT false,
  can_assign_categories BOOLEAN DEFAULT false,
  assigned_category_ids TEXT[] DEFAULT '{}',
  
  -- Receipt permissions
  can_view_receipts BOOLEAN DEFAULT false,
  can_create_receipts BOOLEAN DEFAULT false,
  can_assign_receipt_templates BOOLEAN DEFAULT false,
  
  -- Template permissions
  can_view_templates BOOLEAN DEFAULT false,
  can_create_templates BOOLEAN DEFAULT false,
  can_assign_templates BOOLEAN DEFAULT false,
  assigned_template_ids TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. receipt_templates
```sql
CREATE TABLE receipt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_html TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. receipts
```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  template_id UUID NOT NULL REFERENCES receipt_templates(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project settings:
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon key

## 📦 Storage Buckets

Create these public buckets in Supabase Storage:

1. **admin-profiles** - For admin profile images
2. **category-images** - For category images
3. **product-images** - For product images (future use)

### Bucket Settings
- Make buckets **public** (allow public access)
- Enable CORS if needed
- Set appropriate file size limits

## 🔗 Service Layer

### Available Services

#### adminService
```typescript
- getAllAdmins()
- getAdminById(id)
- getAdminPermissions(adminId)
- createAdmin(name, email, phone?, profileImageUrl?)
- updateAdmin(id, updates)
- deleteAdmin(id)
- saveAdminPermissions(adminId, permissions)
- uploadProfileImage(adminId, file)
```

#### productService
```typescript
- getAllProducts()
- getProductById(id)
- createProduct(product)
- updateProduct(id, updates)
- deleteProduct(id)
```

#### categoryService
```typescript
- getAllCategories()
- getCategoryById(id)
- createCategory(category)
- updateCategory(id, updates)
- deleteCategory(id)
- uploadCategoryImage(categoryId, file)
```

#### templateService
```typescript
- getAllTemplates()
- getTemplateById(id)
- createTemplate(template)
- updateTemplate(id, updates)
- deleteTemplate(id)
```

#### receiptService
```typescript
- getAllReceipts()
- getReceiptById(id)
- createReceipt(receipt)
- updateReceipt(id, updates)
- deleteReceipt(id)
- updateReceiptStatus(id, status)
```

## 🧪 Testing Database Connection

### 1. Check Supabase Connection
```typescript
// In browser console
import { supabase } from '@/lib/supabase'
const { data, error } = await supabase.from('users').select('*').limit(1)
console.log(data, error)
```

### 2. Test Each Service
```typescript
// Test product service
import { productService } from '@/services/productService'
const products = await productService.getAllProducts()
console.log(products)

// Test category service
import { categoryService } from '@/services/categoryService'
const categories = await categoryService.getAllCategories()
console.log(categories)

// Test receipt service
import { receiptService } from '@/services/receiptService'
const receipts = await receiptService.getAllReceipts()
console.log(receipts)

// Test template service
import { templateService } from '@/services/templateService'
const templates = await templateService.getAllTemplates()
console.log(templates)

// Test admin service
import { adminService } from '@/services/adminService'
const admins = await adminService.getAllAdmins()
console.log(admins)
```

## 🔒 Row Level Security (RLS)

For production, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policies (example for public read)
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

-- Add more specific policies as needed
```

## 📊 Data Relationships

```
users (1) ──→ (many) admin_permissions
users (1) ──→ (many) receipt_templates

categories (1) ──→ (many) products
categories (1) ──→ (many) categories (self-referencing for parent-child)

receipt_templates (1) ──→ (many) receipts
```

## 🐛 Troubleshooting

### Connection Issues
1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check network connectivity
4. Look at browser console for errors

### Table Not Found
1. Verify table exists in Supabase
2. Check table name spelling (case-sensitive)
3. Ensure you have proper permissions

### Permission Errors
1. Check RLS policies
2. Verify auth token is valid
3. Check user role and permissions

### Image Upload Fails
1. Verify storage bucket exists
2. Check bucket is public
3. Verify file size is within limits
4. Check CORS settings

## 📈 Performance Tips

1. **Indexing** - Add indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_products_category ON products(category_id);
   CREATE INDEX idx_receipts_template ON receipts(template_id);
   CREATE INDEX idx_categories_parent ON categories(parent_id);
   ```

2. **Pagination** - Use `.range()` for large datasets:
   ```typescript
   const { data } = await supabase
     .from('products')
     .select('*')
     .range(0, 9)
   ```

3. **Selective Queries** - Only select needed columns:
   ```typescript
   const { data } = await supabase
     .from('products')
     .select('id, name, price')
   ```

## 🔄 Syncing Data

All pages automatically sync with database on load. To manually refresh:

```typescript
// In any component
const loadData = async () => {
  const data = await productService.getAllProducts()
  setProducts(data)
}
```

---

**Last Updated**: Dec 4, 2025
**Version**: 1.0.0
