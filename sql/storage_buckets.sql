-- Create Supabase Storage buckets
-- Run this in Supabase SQL Editor before applying storage_policies.sql

-- Create admin-profiles bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-profiles', 'admin-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create vendor-image bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-image', 'vendor-image', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create receipt-exports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-exports', 'receipt-exports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create brand-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;
