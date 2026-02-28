-- xReceipt Safe Migration Schema with Public RLS Policies
-- For updating existing databases while preserving data
-- RLS enabled with public access for development

-- ============================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users
SET role = 'grand_user'
WHERE role IN ('god_user');

-- Coerce any legacy/invalid roles into the supported set so the CHECK
-- constraint can be applied safely on existing databases.
UPDATE users
SET role = 'admin'
WHERE role NOT IN ('grand_user', 'admin', 'super_admin') OR role IS NULL;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('grand_user', 'admin', 'super_admin'));

-- ============================================
-- 2. CREATE NEW TABLES IF THEY DON'T EXIST
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  image_url VARCHAR(500),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendors ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS admin_vendor_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  can_view_products BOOLEAN DEFAULT FALSE,
  can_create_products BOOLEAN DEFAULT FALSE,

  can_view_categories BOOLEAN DEFAULT FALSE,
  can_create_categories BOOLEAN DEFAULT FALSE,

  can_view_receipts BOOLEAN DEFAULT FALSE,
  can_create_receipts BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (admin_id, vendor_id)
);

-- Remove legacy permission columns (idempotent)
ALTER TABLE IF EXISTS admin_vendor_permissions
  DROP COLUMN IF EXISTS can_assign_receipt_templates,
  DROP COLUMN IF EXISTS can_assign_templates,
  DROP COLUMN IF EXISTS assigned_template_ids,
  DROP COLUMN IF EXISTS assigned_product_ids,
  DROP COLUMN IF EXISTS can_assign_categories,
  DROP COLUMN IF EXISTS assigned_category_ids,
  DROP COLUMN IF EXISTS can_view_templates,
  DROP COLUMN IF EXISTS can_create_templates;

CREATE TABLE IF NOT EXISTS vendor_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_vendor_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (vendor_id, admin_id)
);

 -- Enforce single-shop-per-admin (an admin can only belong to one vendor)
 DO $$
 BEGIN
   WITH ranked AS (
     SELECT
       id,
       ROW_NUMBER() OVER (PARTITION BY admin_id ORDER BY created_at ASC, id ASC) AS rn
     FROM vendor_admins
   )
   DELETE FROM vendor_admins va
   USING ranked r
   WHERE va.id = r.id AND r.rn > 1;

   IF NOT EXISTS (
     SELECT 1
     FROM pg_constraint
     WHERE conname = 'vendor_admins_admin_id_unique'
   ) THEN
     ALTER TABLE vendor_admins
       ADD CONSTRAINT vendor_admins_admin_id_unique UNIQUE (admin_id);
   END IF;
 END $$;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  imei_or_model VARCHAR(255),
  color VARCHAR(100),
  tax_enabled BOOLEAN DEFAULT TRUE,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_enabled BOOLEAN DEFAULT FALSE,
  discount_type VARCHAR(20) DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'flat')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add tax_enabled column to existing products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imei_or_model VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_discount_type_check'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_discount_type_check
    CHECK (discount_type IN ('none', 'percentage', 'flat'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_html TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Join table for many-to-many assignment of templates to vendors
CREATE TABLE IF NOT EXISTS receipt_template_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES receipt_templates(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (template_id, vendor_id)
);

 -- ============================================
 -- 2B. BRAND SETTINGS TABLE
 -- ============================================
 CREATE TABLE IF NOT EXISTS brand_settings (
   vendor_id UUID PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
   app_name VARCHAR(255) NOT NULL DEFAULT 'xReceipt',
   tagline VARCHAR(255),
   icon_url VARCHAR(500),
   icon_path VARCHAR(500),
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 );

CREATE INDEX IF NOT EXISTS idx_receipt_template_vendors_template_id ON receipt_template_vendors(template_id);
CREATE INDEX IF NOT EXISTS idx_receipt_template_vendors_vendor_id ON receipt_template_vendors(vendor_id);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  can_view_products BOOLEAN DEFAULT FALSE,
  can_create_products BOOLEAN DEFAULT FALSE,
  
  can_view_categories BOOLEAN DEFAULT FALSE,
  can_create_categories BOOLEAN DEFAULT FALSE,
  
  can_view_receipts BOOLEAN DEFAULT FALSE,
  can_create_receipts BOOLEAN DEFAULT FALSE,
  
  can_view_templates BOOLEAN DEFAULT FALSE,
  can_create_templates BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Remove legacy permission columns (idempotent)
ALTER TABLE IF EXISTS admin_permissions
  DROP COLUMN IF EXISTS can_assign_receipt_templates,
  DROP COLUMN IF EXISTS can_assign_templates,
  DROP COLUMN IF EXISTS assigned_template_ids,
  DROP COLUMN IF EXISTS assigned_product_ids,
  DROP COLUMN IF EXISTS can_assign_categories,
  DROP COLUMN IF EXISTS assigned_category_ids;

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  template_id UUID REFERENCES receipt_templates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_company VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  notes TEXT,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'none',
  discount_value DECIMAL(10, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add status column to existing receipts table if it doesn't exist
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_company VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE receipt_templates ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'receipts_discount_type_check'
  ) THEN
    ALTER TABLE receipts
    ADD CONSTRAINT receipts_discount_type_check
    CHECK (discount_type IN ('none', 'percentage', 'flat'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  imei_or_model VARCHAR(255),
  color VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  tax_enabled BOOLEAN DEFAULT TRUE,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_enabled BOOLEAN DEFAULT FALSE,
  discount_type VARCHAR(20) DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'flat')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS imei_or_model VARCHAR(255);
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT 0;

-- Remove deprecated email columns if they exist
ALTER TABLE products DROP COLUMN IF EXISTS email;
ALTER TABLE receipt_items DROP COLUMN IF EXISTS email;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'receipt_items_discount_type_check'
  ) THEN
    ALTER TABLE receipt_items
    ADD CONSTRAINT receipt_items_discount_type_check
    CHECK (discount_type IN ('none', 'percentage', 'flat'));
  END IF;
END $$;

-- ============================================
-- 3. CREATE INDEXES IF THEY DON'T EXIST
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_categories_vendor_id ON categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_id ON vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_admin_id ON vendors(admin_id);
CREATE INDEX IF NOT EXISTS idx_vendor_admins_vendor_id ON vendor_admins(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_admins_admin_id ON vendor_admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipt_templates_created_by ON receipt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_receipt_templates_vendor_id ON receipt_templates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_vendor_permissions_admin_id ON admin_vendor_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_vendor_permissions_vendor_id ON admin_vendor_permissions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_template_id ON receipts(template_id);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor_id ON receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id ON receipt_items(product_id);

-- ============================================
-- 4. STORAGE BUCKETS (OPTIONAL)
-- ============================================
-- Create required Supabase storage buckets if the storage.buckets table exists.
-- This is safe to run on Supabase; on plain Postgres the DO block will
-- simply no-op if the storage schema/table is missing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    BEGIN
      INSERT INTO storage.buckets (id, name, public)
      VALUES
        ('admin-profiles', 'admin-profiles', true),
        ('vendor-image', 'vendor-image', true),
        ('receipt-exports', 'receipt-exports', true),
        ('brand-assets', 'brand-assets', true)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN insufficient_privilege THEN
        NULL;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ENABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_vendor_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_template_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. DROP EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Public insert access" ON users;
DROP POLICY IF EXISTS "Public update access" ON users;
DROP POLICY IF EXISTS "Public delete access" ON users;

DROP POLICY IF EXISTS "Public read access" ON vendors;
DROP POLICY IF EXISTS "Public insert access" ON vendors;
DROP POLICY IF EXISTS "Public update access" ON vendors;
DROP POLICY IF EXISTS "Public delete access" ON vendors;

DROP POLICY IF EXISTS "Public read access" ON categories;
DROP POLICY IF EXISTS "Public insert access" ON categories;
DROP POLICY IF EXISTS "Public update access" ON categories;
DROP POLICY IF EXISTS "Public delete access" ON categories;

DROP POLICY IF EXISTS "Public read access" ON products;
DROP POLICY IF EXISTS "Public insert access" ON products;
DROP POLICY IF EXISTS "Public update access" ON products;
DROP POLICY IF EXISTS "Public delete access" ON products;

DROP POLICY IF EXISTS "Public read access" ON receipt_templates;
DROP POLICY IF EXISTS "Public insert access" ON receipt_templates;
DROP POLICY IF EXISTS "Public update access" ON receipt_templates;
DROP POLICY IF EXISTS "Public delete access" ON receipt_templates;

DROP POLICY IF EXISTS "Public read access" ON admin_permissions;
DROP POLICY IF EXISTS "Public insert access" ON admin_permissions;
DROP POLICY IF EXISTS "Public update access" ON admin_permissions;
DROP POLICY IF EXISTS "Public delete access" ON admin_permissions;

DROP POLICY IF EXISTS "Public read access" ON admin_vendor_permissions;
DROP POLICY IF EXISTS "Public insert access" ON admin_vendor_permissions;
DROP POLICY IF EXISTS "Public update access" ON admin_vendor_permissions;
DROP POLICY IF EXISTS "Public delete access" ON admin_vendor_permissions;

DROP POLICY IF EXISTS "Public read access" ON receipts;
DROP POLICY IF EXISTS "Public insert access" ON receipts;
DROP POLICY IF EXISTS "Public update access" ON receipts;
DROP POLICY IF EXISTS "Public delete access" ON receipts;

DROP POLICY IF EXISTS "Public read access" ON receipt_items;
DROP POLICY IF EXISTS "Public insert access" ON receipt_items;
DROP POLICY IF EXISTS "Public update access" ON receipt_items;
DROP POLICY IF EXISTS "Public delete access" ON receipt_items;

DROP POLICY IF EXISTS "Public read access" ON vendor_admins;
DROP POLICY IF EXISTS "Public insert access" ON vendor_admins;
DROP POLICY IF EXISTS "Public update access" ON vendor_admins;
DROP POLICY IF EXISTS "Public delete access" ON vendor_admins;
DROP POLICY IF EXISTS "Public read access" ON receipt_template_vendors;
DROP POLICY IF EXISTS "Public insert access" ON receipt_template_vendors;
DROP POLICY IF EXISTS "Public update access" ON receipt_template_vendors;
DROP POLICY IF EXISTS "Public delete access" ON receipt_template_vendors;
DROP POLICY IF EXISTS "Public read access" ON brand_settings;
DROP POLICY IF EXISTS "Public insert access" ON brand_settings;
DROP POLICY IF EXISTS "Public update access" ON brand_settings;
DROP POLICY IF EXISTS "Public delete access" ON brand_settings;

-- Drop old RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Super admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Super admins can manage products" ON products;
DROP POLICY IF EXISTS "Anyone can view templates" ON receipt_templates;
DROP POLICY IF EXISTS "Super admins can manage templates" ON receipt_templates;
DROP POLICY IF EXISTS "Admins can view their own permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Super admins can manage permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Users can view their own receipts" ON receipts;
DROP POLICY IF EXISTS "Super admins can view all receipts" ON receipts;
DROP POLICY IF EXISTS "Admins can create receipts" ON receipts;
DROP POLICY IF EXISTS "Users can view items in their receipts" ON receipt_items;

-- ============================================
-- 7. CREATE PUBLIC RLS POLICIES
-- ============================================

-- Public access policies (for development)
CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON users FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON users FOR DELETE USING (true);

CREATE POLICY "Public read access" ON vendors FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON vendors FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON vendors FOR DELETE USING (true);

CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON categories FOR DELETE USING (true);

CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON products FOR DELETE USING (true);

CREATE POLICY "Public read access" ON receipt_templates FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipt_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipt_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipt_templates FOR DELETE USING (true);

CREATE POLICY "Public read access" ON admin_permissions FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON admin_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON admin_permissions FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON admin_permissions FOR DELETE USING (true);

CREATE POLICY "Public read access" ON admin_vendor_permissions FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON admin_vendor_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON admin_vendor_permissions FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON admin_vendor_permissions FOR DELETE USING (true);

CREATE POLICY "Public read access" ON receipts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipts FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipts FOR DELETE USING (true);

CREATE POLICY "Public read access" ON receipt_items FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipt_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipt_items FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipt_items FOR DELETE USING (true);

CREATE POLICY "Public read access" ON vendor_admins FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON vendor_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON vendor_admins FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON vendor_admins FOR DELETE USING (true);

CREATE POLICY "Public read access" ON receipt_template_vendors FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipt_template_vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipt_template_vendors FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipt_template_vendors FOR DELETE USING (true);

CREATE POLICY "Public read access" ON brand_settings FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON brand_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON brand_settings FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON brand_settings FOR DELETE USING (true);

-- ============================================
-- 8. CREATE OR REPLACE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. CREATE OR REPLACE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_receipt_templates_updated_at ON receipt_templates;
DROP TRIGGER IF EXISTS update_admin_permissions_updated_at ON admin_permissions;
DROP TRIGGER IF EXISTS update_admin_vendor_permissions_updated_at ON admin_vendor_permissions;
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
DROP TRIGGER IF EXISTS update_vendor_admins_updated_at ON vendor_admins;
DROP TRIGGER IF EXISTS update_receipt_template_vendors_updated_at ON receipt_template_vendors;
DROP TRIGGER IF EXISTS update_brand_settings_updated_at ON brand_settings;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_templates_updated_at BEFORE UPDATE ON receipt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON admin_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_vendor_permissions_updated_at BEFORE UPDATE ON admin_vendor_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_admins_updated_at BEFORE UPDATE ON vendor_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_template_vendors_updated_at BEFORE UPDATE ON receipt_template_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. SEED DEFAULT GRAND USER (OPTIONAL)
-- ============================================

-- Ensure password_hash column exists (for existing databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

INSERT INTO users (email, name, role, password_hash)
VALUES ('goduser@xreceipt.com', 'System Grand User', 'grand_user', '$2b$10$DkyhpvaaOkOqoe38uZMkw.EVZ2ElUxE85vYv/c.2JMU8qHxG5z1d6')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Drop the old admin_permissions table (no longer used - using admin_vendor_permissions only)
DROP TABLE IF EXISTS admin_permissions;

-- ============================================
-- END OF SAFE MIGRATION
-- ============================================
