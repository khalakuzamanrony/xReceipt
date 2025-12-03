# Database Setup Guide

## Overview

This guide explains how to set up the xReceipt database in Supabase. There are two approaches:

1. **Fresh Setup** - For new projects (use `master.sql`)
2. **Safe Migration** - For updating existing databases (use `safe_master.sql`)

---

## Prerequisites

- Supabase account
- xReceipt project created in Supabase
- Access to Supabase SQL editor

---

## Option 1: Fresh Setup (New Project)

### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Navigate to **SQL Editor** from the left sidebar
4. Click **New Query**

### Step 2: Run Master Schema

1. Open `/sql/master.sql` from your project
2. Copy the entire content
3. Paste it into the Supabase SQL editor
4. Click **Run** button

This will create:
- ✅ All required tables
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for automatic timestamps

### Step 3: Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket** and create these buckets:
   - `admin-profiles` (for admin profile images)
   - `category-images` (for category images)
   - `receipt-exports` (for PDF/PNG exports)

3. For each bucket:
   - Set to **Public** if you want public access
   - Or **Private** and configure RLS policies

### Step 4: Update Environment Variables

Create `.env.local` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Option 2: Safe Migration (Existing Database)

Use this approach if you already have data in your database.

### Step 1: Run Safe Migration Script

1. Go to Supabase SQL Editor
2. Click **New Query**
3. Open `/sql/safe_master.sql` from your project
4. Copy and paste the entire content
5. Click **Run**

This will:
- ✅ Add missing columns to existing tables
- ✅ Create new tables without dropping existing ones
- ✅ Add indexes if they don't exist
- ✅ Update RLS policies
- ✅ Preserve all existing data

### Step 2: Verify Data Integrity

After running the migration:

1. Check existing tables are intact
2. Verify new tables were created
3. Test that data is still accessible

---

## Database Schema Overview

### Tables

#### `users`
Stores user accounts (super_admin and admin roles)

```sql
- id (UUID, primary key)
- email (VARCHAR, unique)
- name (VARCHAR)
- phone (VARCHAR)
- role (VARCHAR: 'super_admin' or 'admin')
- profile_image_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `categories`
Product categories

```sql
- id (UUID, primary key)
- name (VARCHAR)
- image_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `products`
Product catalog

```sql
- id (UUID, primary key)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- category_id (UUID, foreign key)
- image_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `receipt_templates`
Receipt design templates

```sql
- id (UUID, primary key)
- name (VARCHAR)
- description (TEXT)
- template_html (TEXT)
- created_by (UUID, foreign key)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `admin_permissions`
Admin access control and permissions

```sql
- id (UUID, primary key)
- admin_id (UUID, foreign key, unique)
- can_view_products (BOOLEAN)
- can_create_products (BOOLEAN)
- assigned_product_ids (UUID[])
- can_view_categories (BOOLEAN)
- can_create_categories (BOOLEAN)
- can_assign_categories (BOOLEAN)
- assigned_category_ids (UUID[])
- can_view_receipts (BOOLEAN)
- can_create_receipts (BOOLEAN)
- can_assign_receipt_templates (BOOLEAN)
- can_view_templates (BOOLEAN)
- can_create_templates (BOOLEAN)
- can_assign_templates (BOOLEAN)
- assigned_template_ids (UUID[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `receipts`
Generated receipts

```sql
- id (UUID, primary key)
- receipt_number (VARCHAR, unique)
- template_id (UUID, foreign key)
- created_by (UUID, foreign key)
- customer_name (VARCHAR)
- customer_email (VARCHAR)
- notes (TEXT)
- subtotal (DECIMAL)
- tax (DECIMAL)
- total (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `receipt_items`
Line items in receipts

```sql
- id (UUID, primary key)
- receipt_id (UUID, foreign key)
- product_id (UUID, foreign key)
- name (VARCHAR)
- quantity (INTEGER)
- unit_price (DECIMAL)
- total (DECIMAL)
- created_at (TIMESTAMP)
```

---

## Storage Buckets

### `admin-profiles`
- **Purpose**: Store admin profile images
- **Access**: Public or Private (configure as needed)
- **Path Format**: `{admin_id}-{timestamp}`

### `category-images`
- **Purpose**: Store category images
- **Access**: Public or Private (configure as needed)
- **Path Format**: `{category_id}-{timestamp}`

### `receipt-exports`
- **Purpose**: Store exported receipts (PDF, PNG)
- **Access**: Private (user-specific)
- **Path Format**: `{user_id}/{receipt_id}-{timestamp}`

---

## Row Level Security (RLS) Policies

RLS is enabled on all tables to ensure data security:

### Users Table
- Users can view their own profile
- Super admins can view all users

### Categories & Products
- Anyone can view
- Super admins can manage

### Receipt Templates
- Anyone can view
- Super admins can manage

### Admin Permissions
- Admins can view their own permissions
- Super admins can manage all permissions

### Receipts
- Users can view their own receipts
- Super admins can view all receipts
- Admins with permission can create receipts

### Receipt Items
- Users can view items in their own receipts

---

## Indexes

Indexes are created for performance optimization:

- `idx_users_email` - Fast email lookups
- `idx_users_role` - Filter by role
- `idx_products_category_id` - Products by category
- `idx_receipt_templates_created_by` - Templates by creator
- `idx_admin_permissions_admin_id` - Permissions lookup
- `idx_receipts_receipt_number` - Receipt number lookup
- `idx_receipts_template_id` - Receipts by template
- `idx_receipts_created_by` - Receipts by creator
- `idx_receipts_created_at` - Receipts by date
- `idx_receipt_items_receipt_id` - Items by receipt
- `idx_receipt_items_product_id` - Items by product

---

## Triggers & Functions

### `update_updated_at_column()`
Automatically updates the `updated_at` timestamp whenever a record is modified.

Applied to:
- users
- categories
- products
- receipt_templates
- admin_permissions
- receipts

---

## Troubleshooting

### Error: "relation does not exist"
- The tables haven't been created yet
- Run the master.sql script in Supabase SQL editor

### Error: "permission denied"
- Check RLS policies are correctly configured
- Verify user role and permissions
- Ensure authentication is working

### Error: "duplicate key value"
- A unique constraint was violated
- Check for duplicate emails or receipt numbers
- Use safe_master.sql for migrations

### Images not uploading
- Check storage bucket exists
- Verify bucket permissions (public/private)
- Check file size limits
- Verify authentication token

---

## Testing the Setup

### Test 1: Create a User
```sql
INSERT INTO users (email, name, role) 
VALUES ('test@example.com', 'Test Admin', 'admin');
```

### Test 2: Create a Category
```sql
INSERT INTO categories (name) 
VALUES ('Pet Toys');
```

### Test 3: Create a Product
```sql
INSERT INTO products (name, price, category_id) 
VALUES ('Rubber Ball', 9.99, 'category-uuid-here');
```

### Test 4: Verify Data
```sql
SELECT * FROM users;
SELECT * FROM categories;
SELECT * FROM products;
```

---

## Next Steps

1. ✅ Run database schema (master.sql or safe_master.sql)
2. ✅ Create storage buckets
3. ✅ Update environment variables
4. ✅ Test database connection
5. ✅ Build Admin Management page
6. ✅ Implement authentication
7. ✅ Build remaining pages

---

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review RLS policies in Supabase dashboard
3. Check browser console for errors
4. Verify environment variables are correct

