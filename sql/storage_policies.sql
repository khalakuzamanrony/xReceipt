-- Storage object policies (Supabase Storage RLS)
-- Run this in Supabase SQL Editor after creating the buckets.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN
    BEGIN
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- admin-profiles bucket (full access for anon + authenticated)
      DROP POLICY IF EXISTS "admin-profiles read" ON storage.objects;
      DROP POLICY IF EXISTS "admin-profiles insert" ON storage.objects;
      DROP POLICY IF EXISTS "admin-profiles update" ON storage.objects;
      DROP POLICY IF EXISTS "admin-profiles delete" ON storage.objects;

      CREATE POLICY "admin-profiles read" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'admin-profiles');

      CREATE POLICY "admin-profiles insert" ON storage.objects
        FOR INSERT TO anon, authenticated
        WITH CHECK (bucket_id = 'admin-profiles');

      CREATE POLICY "admin-profiles update" ON storage.objects
        FOR UPDATE TO anon, authenticated
        USING (bucket_id = 'admin-profiles')
        WITH CHECK (bucket_id = 'admin-profiles');

      CREATE POLICY "admin-profiles delete" ON storage.objects
        FOR DELETE TO anon, authenticated
        USING (bucket_id = 'admin-profiles');

      -- vendor-image bucket (full access for anon + authenticated)
      DROP POLICY IF EXISTS "vendor-image read" ON storage.objects;
      DROP POLICY IF EXISTS "vendor-image insert" ON storage.objects;
      DROP POLICY IF EXISTS "vendor-image update" ON storage.objects;
      DROP POLICY IF EXISTS "vendor-image delete" ON storage.objects;

      CREATE POLICY "vendor-image read" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'vendor-image');

      CREATE POLICY "vendor-image insert" ON storage.objects
        FOR INSERT TO anon, authenticated
        WITH CHECK (bucket_id = 'vendor-image');

      CREATE POLICY "vendor-image update" ON storage.objects
        FOR UPDATE TO anon, authenticated
        USING (bucket_id = 'vendor-image')
        WITH CHECK (bucket_id = 'vendor-image');

      CREATE POLICY "vendor-image delete" ON storage.objects
        FOR DELETE TO anon, authenticated
        USING (bucket_id = 'vendor-image');

      -- receipt-exports bucket (full access for anon + authenticated)
      DROP POLICY IF EXISTS "receipt-exports read" ON storage.objects;
      DROP POLICY IF EXISTS "receipt-exports insert" ON storage.objects;
      DROP POLICY IF EXISTS "receipt-exports update" ON storage.objects;
      DROP POLICY IF EXISTS "receipt-exports delete" ON storage.objects;

      CREATE POLICY "receipt-exports read" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'receipt-exports');

      CREATE POLICY "receipt-exports insert" ON storage.objects
        FOR INSERT TO anon, authenticated
        WITH CHECK (bucket_id = 'receipt-exports');

      CREATE POLICY "receipt-exports update" ON storage.objects
        FOR UPDATE TO anon, authenticated
        USING (bucket_id = 'receipt-exports')
        WITH CHECK (bucket_id = 'receipt-exports');

      CREATE POLICY "receipt-exports delete" ON storage.objects
        FOR DELETE TO anon, authenticated
        USING (bucket_id = 'receipt-exports');

      -- brand-assets bucket (full access for anon + authenticated)
      DROP POLICY IF EXISTS "brand-assets read" ON storage.objects;
      DROP POLICY IF EXISTS "brand-assets insert" ON storage.objects;
      DROP POLICY IF EXISTS "brand-assets update" ON storage.objects;
      DROP POLICY IF EXISTS "brand-assets delete" ON storage.objects;

      CREATE POLICY "brand-assets read" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'brand-assets');

      CREATE POLICY "brand-assets insert" ON storage.objects
        FOR INSERT TO anon, authenticated
        WITH CHECK (bucket_id = 'brand-assets');

      CREATE POLICY "brand-assets update" ON storage.objects
        FOR UPDATE TO anon, authenticated
        USING (bucket_id = 'brand-assets')
        WITH CHECK (bucket_id = 'brand-assets');

      CREATE POLICY "brand-assets delete" ON storage.objects
        FOR DELETE TO anon, authenticated
        USING (bucket_id = 'brand-assets');
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to create storage policies. Run this in Supabase SQL Editor as a project owner (service role).';
      WHEN undefined_object THEN
        RAISE EXCEPTION 'storage.objects table not found. Ensure Supabase Storage is enabled for this project.';
      WHEN undefined_table THEN
        RAISE EXCEPTION 'storage.objects table not found. Ensure Supabase Storage is enabled for this project.';
      WHEN others THEN
        RAISE;
    END;
  ELSE
    RAISE EXCEPTION 'Supabase Storage schema/table not detected (storage.objects missing). Enable Storage in Supabase.';
  END IF;
END;
$$ LANGUAGE plpgsql;
