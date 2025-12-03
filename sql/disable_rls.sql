-- Disable RLS on all tables
-- Run this if you have RLS policies causing errors

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies
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
