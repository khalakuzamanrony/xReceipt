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

      -- Vendor images (shop images)
      DROP POLICY IF EXISTS "Vendor images read (auth)" ON storage.objects;
      DROP POLICY IF EXISTS "Vendor images insert (auth)" ON storage.objects;
      DROP POLICY IF EXISTS "Vendor images update (auth)" ON storage.objects;
      DROP POLICY IF EXISTS "Vendor images delete (auth)" ON storage.objects;

      CREATE POLICY "Vendor images read (auth)" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'vendor-image');

      CREATE POLICY "Vendor images insert (auth)" ON storage.objects
        FOR INSERT TO anon, authenticated
        WITH CHECK (bucket_id = 'vendor-image');

      CREATE POLICY "Vendor images update (auth)" ON storage.objects
        FOR UPDATE TO anon, authenticated
        USING (bucket_id = 'vendor-image');

      CREATE POLICY "Vendor images delete (auth)" ON storage.objects
        FOR DELETE TO anon, authenticated
        USING (bucket_id = 'vendor-image');
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
