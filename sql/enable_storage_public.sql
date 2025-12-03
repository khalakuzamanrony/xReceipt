-- Enable Public Access to Storage Buckets
-- Run this in Supabase SQL Editor to allow public uploads

-- ============================================
-- STORAGE BUCKET POLICIES - PUBLIC ACCESS
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Public delete" ON storage.objects;

-- ============================================
-- CREATE PUBLIC POLICIES FOR STORAGE
-- ============================================

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
-- DONE - Storage is now public
-- ============================================
