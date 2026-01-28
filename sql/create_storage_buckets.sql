-- Create Storage Buckets with Public Access
-- Run this in Supabase SQL Editor

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================

-- Create admin-profiles bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-profiles', 'admin-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create category-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create vendor-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-images', 'vendor-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create receipt-exports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-exports', 'receipt-exports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ============================================
-- DISABLE RLS ON STORAGE OBJECTS
-- ============================================

ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE PUBLIC POLICIES FOR STORAGE
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Public delete" ON storage.objects;
DROP POLICY IF EXISTS "Public update" ON storage.objects;

-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to upload files
CREATE POLICY "Public upload"
ON storage.objects FOR INSERT
WITH CHECK (true);

-- Allow anyone to read files
CREATE POLICY "Public read"
ON storage.objects FOR SELECT
USING (true);

-- Allow anyone to delete files
CREATE POLICY "Public delete"
ON storage.objects FOR DELETE
USING (true);

-- Allow anyone to update files
CREATE POLICY "Public update"
ON storage.objects FOR UPDATE
USING (true);

-- ============================================
-- DONE - Storage buckets created and public
-- ============================================
