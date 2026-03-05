-- xReceipt Master Schema with Public RLS Policies
-- Fresh database setup for new installations
-- RLS enabled with public access for development

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'spatial_ref_sys'
  ) LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', r.tablename);
  END LOOP;
END $$;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('grand_user', 'admin', 'super_admin')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  profile_image_url VARCHAR(500),
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Normalize users.role constraint and legacy values so this script is safe on older databases
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'grand_user' WHERE role IN ('god_user');
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('grand_user', 'admin', 'super_admin'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
UPDATE users SET status = 'active' WHERE status NOT IN ('active', 'inactive') OR status IS NULL;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'));

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

CREATE INDEX IF NOT EXISTS idx_vendors_vendor_id ON vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_admin_id ON vendors(admin_id);

CREATE TABLE IF NOT EXISTS vendor_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_vendor_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (vendor_id, admin_id)
);

-- Keep associated users in sync with vendor status
CREATE OR REPLACE FUNCTION sync_vendor_user_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'inactive' THEN
      UPDATE users
      SET status = 'inactive',
          updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT va.admin_id
        FROM vendor_admins va
        WHERE va.vendor_id = NEW.id
      );
    ELSIF NEW.status = 'active' THEN
      UPDATE users
      SET status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT va.admin_id
        FROM vendor_admins va
        WHERE va.vendor_id = NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendors_sync_user_status ON vendors;
CREATE TRIGGER vendors_sync_user_status
AFTER UPDATE OF status ON vendors
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_user_status();

-- Enforce single-shop-per-admin (an admin can only belong to one vendor)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY admin_id ORDER BY created_at ASC, id ASC) AS rn
  FROM vendor_admins
)
DELETE FROM vendor_admins va
USING ranked r
WHERE va.id = r.id AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_admins_admin_id_unique'
  ) THEN
    ALTER TABLE vendor_admins
      ADD CONSTRAINT vendor_admins_admin_id_unique UNIQUE (admin_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_admins_vendor_id ON vendor_admins(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_admins_admin_id ON vendor_admins(admin_id);

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_categories_vendor_id ON categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);

-- ============================================
-- 4. RECEIPT TEMPLATES TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_receipt_templates_created_by ON receipt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_receipt_templates_vendor_id ON receipt_templates(vendor_id);

-- Join table for many-to-many assignment of templates to vendors
CREATE TABLE IF NOT EXISTS receipt_template_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES receipt_templates(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (template_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_template_vendors_template_id ON receipt_template_vendors(template_id);
CREATE INDEX IF NOT EXISTS idx_receipt_template_vendors_vendor_id ON receipt_template_vendors(vendor_id);

 -- ============================================
 -- 4B. BRAND SETTINGS TABLE
 -- ============================================
 CREATE TABLE IF NOT EXISTS brand_settings (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   scope TEXT NOT NULL DEFAULT 'vendor' CHECK (scope IN ('vendor', 'global')),
   vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
   conflict_key TEXT GENERATED ALWAYS AS (
     CASE
       WHEN scope = 'global' THEN 'global'
       ELSE ('vendor:' || vendor_id::text)
     END
   ) STORED,
   app_name VARCHAR(255) NOT NULL DEFAULT 'xReceipt',
   tagline VARCHAR(255),
   icon_url VARCHAR(500),
   icon_path VARCHAR(500),
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 );

-- Single conflict target for upserts (works with PostgREST on_conflict)
CREATE UNIQUE INDEX IF NOT EXISTS brand_settings_conflict_key_unique
  ON brand_settings(conflict_key);

-- ============================================
-- 5. ADMIN PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product permissions
  can_view_products BOOLEAN DEFAULT FALSE,
  can_create_products BOOLEAN DEFAULT FALSE,
  
  -- Category permissions
  can_view_categories BOOLEAN DEFAULT FALSE,
  can_create_categories BOOLEAN DEFAULT FALSE,
  
  -- Receipt permissions
  can_view_receipts BOOLEAN DEFAULT FALSE,
  can_create_receipts BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);

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

CREATE INDEX IF NOT EXISTS idx_admin_vendor_permissions_admin_id ON admin_vendor_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_vendor_permissions_vendor_id ON admin_vendor_permissions(vendor_id);

-- ============================================
-- 6. RECEIPTS TABLE
-- ============================================
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
  discount_type VARCHAR(20) DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'flat')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_template_id ON receipts(template_id);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor_id ON receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- ============================================
-- 7. RECEIPT ITEMS TABLE
-- ============================================
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
 
-- For fresh starts, clear all application data but preserve Grand Users
DELETE FROM vendor_admins;
DELETE FROM admin_vendor_permissions;
DELETE FROM admin_permissions;
DELETE FROM receipt_items;
DELETE FROM receipts;
DELETE FROM receipt_templates;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM vendors;

DELETE FROM users WHERE role <> 'grand_user';

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id ON receipt_items(product_id);

-- ============================================
-- 8. STORAGE BUCKETS
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
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
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

-- Public access policies (for development)
-- Everyone can view all data
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
-- 10. FUNCTIONS & TRIGGERS
-- ============================================

-- Maintain brand_settings.conflict_key for stable upserts
CREATE OR REPLACE FUNCTION set_brand_settings_conflict_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scope = 'global' THEN
    NEW.vendor_id := NULL;
    NEW.conflict_key := 'global';
  ELSE
    NEW.conflict_key := 'vendor:' || NEW.vendor_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (safe approach)
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
DROP TRIGGER IF EXISTS set_brand_settings_conflict_key_trigger ON brand_settings;

-- Triggers for updated_at
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

CREATE TRIGGER set_brand_settings_conflict_key_trigger
  BEFORE INSERT OR UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION set_brand_settings_conflict_key();

-- ============================================
-- 11. SEED DEFAULT GRAND USER (OPTIONAL)
-- ============================================

-- Ensure password_hash column exists (for existing databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

INSERT INTO users (email, name, role, password_hash)
VALUES ('granduser@xreceipt.com', 'Grand User', 'grand_user', '$2b$10$DkyhpvaaOkOqoe38uZMkw.EVZ2ElUxE85vYv/c.2JMU8qHxG5z1d6')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================
-- 12. PERMISSION ASSIGNMENT FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION assign_admin_vendor_permissions(
  p_admin_id UUID,
  p_vendor_id UUID,
  p_can_view_products BOOLEAN DEFAULT FALSE,
  p_can_create_products BOOLEAN DEFAULT FALSE,
  p_can_view_categories BOOLEAN DEFAULT FALSE,
  p_can_create_categories BOOLEAN DEFAULT FALSE,
  p_can_view_receipts BOOLEAN DEFAULT FALSE,
  p_can_create_receipts BOOLEAN DEFAULT FALSE,
  p_is_vendor_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS admin_vendor_permissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result admin_vendor_permissions;
  v_admin_exists BOOLEAN;
  v_vendor_exists BOOLEAN;
BEGIN
  -- Validate admin_id exists and is actually an admin (not grand_user)
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = p_admin_id AND role IN ('admin', 'super_admin')
  ) INTO v_admin_exists;
  
  IF NOT v_admin_exists THEN
    RAISE EXCEPTION 'Invalid admin_id: % - User must exist and have admin or super_admin role', p_admin_id
      USING ERRCODE = '23503';
  END IF;
  
  -- Validate vendor_id exists
  SELECT EXISTS(
    SELECT 1 FROM vendors WHERE id = p_vendor_id
  ) INTO v_vendor_exists;
  
  IF NOT v_vendor_exists THEN
    RAISE EXCEPTION 'Invalid vendor_id: % - Vendor does not exist', p_vendor_id
      USING ERRCODE = '23503';
  END IF;
  
  -- Upsert the permission record
  INSERT INTO admin_vendor_permissions (
    admin_id,
    vendor_id,
    can_view_products,
    can_create_products,
    can_view_categories,
    can_create_categories,
    can_view_receipts,
    can_create_receipts,
    is_vendor_super_admin,
    created_at,
    updated_at
  )
  VALUES (
    p_admin_id,
    p_vendor_id,
    p_can_view_products,
    p_can_create_products,
    p_can_view_categories,
    p_can_create_categories,
    p_can_view_receipts,
    p_can_create_receipts,
    p_is_vendor_super_admin,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (admin_id, vendor_id) 
  DO UPDATE SET
    can_view_products = EXCLUDED.can_view_products,
    can_create_products = EXCLUDED.can_create_products,
    can_view_categories = EXCLUDED.can_view_categories,
    can_create_categories = EXCLUDED.can_create_categories,
    can_view_receipts = EXCLUDED.can_view_receipts,
    can_create_receipts = EXCLUDED.can_create_receipts,
    is_vendor_super_admin = EXCLUDED.is_vendor_super_admin,
    updated_at = CURRENT_TIMESTAMP
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_admin_vendor_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION assign_admin_vendor_permissions TO anon;

-- ============================================
-- END OF SCHEMA
-- ============================================
