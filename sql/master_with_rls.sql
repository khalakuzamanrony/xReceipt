-- xReceipt Master Schema with Public RLS Policies
-- Fresh database setup for new installations
-- RLS enabled with public access for development

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('grand_user', 'admin')),
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Normalize users.role constraint and legacy values so this script is safe on older databases
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'grand_user' WHERE role IN ('super_admin', 'god_user');
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('grand_user', 'admin'));

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT,
  url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  image_url VARCHAR(500),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_categories_vendor_id ON categories(vendor_id);

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
  tax_enabled BOOLEAN DEFAULT TRUE,
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
-- 5. ADMIN PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product permissions
  can_view_products BOOLEAN DEFAULT FALSE,
  can_create_products BOOLEAN DEFAULT FALSE,
  assigned_product_ids UUID[] DEFAULT '{}',
  
  -- Category permissions
  can_view_categories BOOLEAN DEFAULT FALSE,
  can_create_categories BOOLEAN DEFAULT FALSE,
  can_assign_categories BOOLEAN DEFAULT FALSE,
  assigned_category_ids UUID[] DEFAULT '{}',
  
  -- Receipt permissions
  can_view_receipts BOOLEAN DEFAULT FALSE,
  can_create_receipts BOOLEAN DEFAULT FALSE,
  can_assign_receipt_templates BOOLEAN DEFAULT FALSE,
  
  -- Template permissions
  can_view_templates BOOLEAN DEFAULT FALSE,
  can_create_templates BOOLEAN DEFAULT FALSE,
  can_assign_templates BOOLEAN DEFAULT FALSE,
  assigned_template_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);

-- ============================================
-- 6. RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  template_id UUID REFERENCES receipt_templates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_company VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  notes TEXT,
  subtotal DECIMAL(10, 2) DEFAULT 0,
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
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
 
-- For fresh starts, clear all application data but preserve Grand Users
DELETE FROM vendor_admins;
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
    INSERT INTO storage.buckets (id, name, public)
    VALUES
      ('admin-profiles', 'admin-profiles', true),
      ('category-images', 'category-images', true),
      ('receipt-exports', 'receipt-exports', true)
    ON CONFLICT (id) DO NOTHING;
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
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_template_vendors ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================

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
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
DROP TRIGGER IF EXISTS update_vendor_admins_updated_at ON vendor_admins;
DROP TRIGGER IF EXISTS update_receipt_template_vendors_updated_at ON receipt_template_vendors;

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

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_admins_updated_at BEFORE UPDATE ON vendor_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_template_vendors_updated_at BEFORE UPDATE ON receipt_template_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. SEED DEFAULT GRAND USER (OPTIONAL)
-- ============================================

INSERT INTO users (email, name, role)
VALUES ('granduser@xreceipt.com', 'Grand User', 'grand_user')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 12. DEMO SEED DATA (OPTIONAL)
-- ============================================
-- This block creates demo vendors, admins, categories, products,
-- templates, receipts, and receipt items for testing.
--
-- All inserts are idempotent: running this script multiple times will
-- not create duplicate demo data. If you do not want demo data in a
-- given environment, simply comment out this section.

DO $$
DECLARE
  i integer;
  cat_idx integer;
  prod_idx integer;
  tpl_idx integer;
  r_idx integer;
  v_id uuid;
  super_admin_id uuid;
  demo_admin_id uuid;
  prod1_id uuid;
  vendor_key text;
  vendor_name text;
  vendor_email text;
  super_email text;
  admin_email text;
  tpl_name text;
  receipt_num text;
  status_text text;
  common_email text;
BEGIN
  -- Two common admins shared across all demo vendors
  INSERT INTO users (email, name, role)
  VALUES
    ('common_admin1@demo.local', 'Common Admin 1', 'admin'),
    ('common_admin2@demo.local', 'Common Admin 2', 'admin')
  ON CONFLICT (email) DO NOTHING;

  -- Create 5 demo vendors with their own super admin and extra admin
  FOR i IN 1..5 LOOP
    vendor_key := format('demo_vendor_%s', i);
    vendor_name := format('Demo Vendor %s', i);
    vendor_email := format('vendor%s@demo.local', i);
    super_email := format('vendor%s_superadmin@demo.local', i);
    admin_email := format('vendor%s_admin@demo.local', i);

    -- Ensure vendor-specific admins exist
    INSERT INTO users (email, name, role)
    VALUES (super_email, format('Vendor %s Super Admin', i), 'admin')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO users (email, name, role)
    VALUES (admin_email, format('Vendor %s Admin', i), 'admin')
    ON CONFLICT (email) DO NOTHING;

    -- Ensure vendor exists
    INSERT INTO vendors (vendor_id, name, email, status)
    VALUES (vendor_key, vendor_name, vendor_email, 'active')
    ON CONFLICT (vendor_id) DO NOTHING;

    -- Load ids
    SELECT id INTO v_id FROM vendors WHERE vendor_id = vendor_key;
    SELECT id INTO super_admin_id FROM users WHERE email = super_email;
    SELECT id INTO demo_admin_id FROM users WHERE email = admin_email;
    prod1_id := NULL;

    IF v_id IS NULL OR super_admin_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Link vendor_admins: super admin
    INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
    SELECT v_id, super_admin_id, TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM vendor_admins va
      WHERE va.vendor_id = v_id AND va.admin_id = super_admin_id
    );

    -- Extra admin per vendor (non super admin)
    IF demo_admin_id IS NOT NULL THEN
      INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
      SELECT v_id, demo_admin_id, FALSE
      WHERE NOT EXISTS (
        SELECT 1 FROM vendor_admins va
        WHERE va.vendor_id = v_id AND va.admin_id = demo_admin_id
      );
    END IF;

    -- Two common admins mapped to every demo vendor (non super admins)
    FOR common_email IN SELECT unnest(ARRAY['common_admin1@demo.local','common_admin2@demo.local']) LOOP
      INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
      SELECT v_id, u.id, FALSE
      FROM users u
      WHERE u.email = common_email
        AND NOT EXISTS (
          SELECT 1 FROM vendor_admins va
          WHERE va.vendor_id = v_id AND va.admin_id = u.id
        );
    END LOOP;

    -- Three categories per vendor
    FOR cat_idx IN 1..3 LOOP
      INSERT INTO categories (name, vendor_id, image_url)
      SELECT format('Demo Category %s', cat_idx), v_id, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c
        WHERE c.vendor_id = v_id AND c.name = format('Demo Category %s', cat_idx)
      );
    END LOOP;

    -- Three products per vendor, each tied to one of the categories
    FOR prod_idx IN 1..3 LOOP
      INSERT INTO products (name, description, price, category_id, image_url, tax_enabled, vendor_id)
      SELECT
        format('Demo Product %s (Vendor %s)', prod_idx, i),
        format('Sample product %s for %s', prod_idx, vendor_name),
        prod_idx * 10.00,
        c.id,
        NULL,
        TRUE,
        v_id
      FROM categories c
      WHERE c.vendor_id = v_id AND c.name = format('Demo Category %s', prod_idx)
        AND NOT EXISTS (
          SELECT 1 FROM products p
          WHERE p.vendor_id = v_id
            AND p.name = format('Demo Product %s (Vendor %s)', prod_idx, i)
        );
    END LOOP;

    -- Remember the first demo product id for creating simple receipt items
    SELECT id INTO prod1_id
    FROM products
    WHERE vendor_id = v_id
      AND name = format('Demo Product 1 (Vendor %s)', i)
    LIMIT 1;

    -- Three templates per vendor (all using a classic reusable layout)
    FOR tpl_idx IN 1..3 LOOP
      tpl_name := format('Demo Classic Template %s (Vendor %s)', tpl_idx, i);

      INSERT INTO receipt_templates (name, description, template_html, created_by, vendor_id)
      SELECT
        tpl_name,
        format('Classic receipt template %s for %s', tpl_idx, vendor_name),
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #111827; background-color: #ffffff; }
    h1, h2, h3 { margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 20px; font-weight: 700; }
    .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .meta-label { text-transform: uppercase; letter-spacing: .05em; font-size: 11px; }
    .meta-value { font-weight: 600; color: #111827; margin-top: 2px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: .08em; margin-bottom: 6px; }
    .customer { margin-bottom: 20px; }
    .customer-main { font-weight: 600; font-size: 14px; color: #111827; }
    .customer-sub { font-size: 13px; color: #4b5563; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.items th { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; text-align: left; color: #6b7280; }
    table.items td { padding: 8px 6px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; }
    table.items td.qty { text-align: center; width: 60px; }
    table.items td.price, table.items td.amount { text-align: right; width: 90px; }
    .totals { margin-top: 12px; max-width: 260px; margin-left: auto; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #4b5563; }
    .total-row.total { border-top: 2px solid #e5e7eb; margin-top: 6px; padding-top: 8px; font-weight: 700; color: #111827; font-size: 14px; }
    .status { margin-top: 16px; font-size: 12px; color: #374151; }
    .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">{{COMPANY_NAME}}</div>
      <div class="company-sub">{{COMPANY_EMAIL}}</div>
    </div>
    <div class="meta">
      <div>
        <div class="meta-label">Receipt</div>
        <div class="meta-value">{{RECEIPT_ID}}</div>
      </div>
      <div style="margin-top: 8px;">
        <div class="meta-label">Date</div>
        <div class="meta-value">{{DATE}}</div>
      </div>
    </div>
  </div>

  <div class="customer">
    <div class="section-title">Billed To</div>
    <div class="customer-main">{{CUSTOMER_NAME}}</div>
    <div class="customer-sub">{{CUSTOMER_EMAIL}}</div>
    <div class="customer-sub">{{CUSTOMER_COMPANY}}</div>
  </div>

  <div>
    <div class="section-title">Items</div>
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Qty</th>
          <th class="price">Price</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{ITEMS}}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>{{SUBTOTAL}}</span>
    </div>
    <div class="total-row">
      <span>Tax</span>
      <span>{{TAX}}</span>
    </div>
    <div class="total-row total">
      <span>Total</span>
      <span>{{TOTAL}}</span>
    </div>
  </div>

  <div class="status">
    Payment status: <strong>{{STATUS}}</strong>
  </div>

  <div class="footer">
    {{FOOTER_MESSAGE}}
  </div>
</body>
</html>',
        super_admin_id,
        v_id
      WHERE NOT EXISTS (
        SELECT 1 FROM receipt_templates t
        WHERE t.vendor_id = v_id AND t.name = tpl_name
      );
    END LOOP;

    -- Three receipts per vendor, each using one of the templates
    FOR r_idx IN 1..3 LOOP
      receipt_num := format('DEMO-V%s-00%s', i, r_idx);
      tpl_name := format('Demo Template %s (Vendor %s)', r_idx, i);
      status_text := CASE r_idx WHEN 1 THEN 'paid' WHEN 2 THEN 'sent' ELSE 'draft' END;

      INSERT INTO receipts (receipt_number, template_id, created_by, vendor_id, customer_name, customer_email, subtotal, tax, total, status)
      SELECT
        receipt_num,
        t.id,
        super_admin_id,
        v_id,
        format('Demo Customer %s (Vendor %s)', r_idx, i),
        format('customer%s.vendor%s@demo.local', r_idx, i),
        (r_idx * 30.00)::DECIMAL(10, 2),
        (r_idx * 5.00)::DECIMAL(10, 2),
        (r_idx * 35.00)::DECIMAL(10, 2),
        status_text
      FROM receipt_templates t
      WHERE t.vendor_id = v_id AND t.name = tpl_name
        AND NOT EXISTS (
          SELECT 1 FROM receipts r WHERE r.receipt_number = receipt_num
        );

      -- Simple single item for each demo receipt
      IF prod1_id IS NOT NULL THEN
        INSERT INTO receipt_items (receipt_id, product_id, name, quantity, unit_price, total)
        SELECT
          r.id,
          prod1_id,
          'Demo Item',
          1,
          10.00,
          10.00
        FROM receipts r
        WHERE r.receipt_number = receipt_num
          AND NOT EXISTS (
            SELECT 1 FROM receipt_items ri
            WHERE ri.receipt_id = r.id AND ri.product_id = prod1_id
          );
      END IF;
    END LOOP;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- END OF SCHEMA
-- ============================================
