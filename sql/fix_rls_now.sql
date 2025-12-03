-- Quick fix: Disable old RLS policies and enable public access
-- Run this immediately in Supabase SQL Editor

-- ============================================
-- 1. DISABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP ALL OLD RLS POLICIES
-- ============================================
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
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Public insert access" ON users;
DROP POLICY IF EXISTS "Public update access" ON users;
DROP POLICY IF EXISTS "Public delete access" ON users;
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

-- ============================================
-- 3. RE-ENABLE RLS WITH PUBLIC POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE NEW PUBLIC RLS POLICIES
-- ============================================

-- Users table - public access
CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON users FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON users FOR DELETE USING (true);

-- Categories table - public access
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON categories FOR DELETE USING (true);

-- Products table - public access
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON products FOR DELETE USING (true);

-- Receipt templates table - public access
CREATE POLICY "Public read access" ON receipt_templates FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipt_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipt_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipt_templates FOR DELETE USING (true);

-- Admin permissions table - public access
CREATE POLICY "Public read access" ON admin_permissions FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON admin_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON admin_permissions FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON admin_permissions FOR DELETE USING (true);

-- Receipts table - public access
CREATE POLICY "Public read access" ON receipts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipts FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipts FOR DELETE USING (true);

-- Receipt items table - public access
CREATE POLICY "Public read access" ON receipt_items FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON receipt_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON receipt_items FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON receipt_items FOR DELETE USING (true);

-- ============================================
-- DONE! Application should work now
-- ============================================
