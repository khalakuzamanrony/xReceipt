# Storage Setup - Do This Now!

## Problem
```
Storage upload failed: StorageApiError: new row violates row-level security policy
```

The storage buckets don't exist or have RLS blocking uploads.

---

## Solution - Run SQL Script (2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Copy & Run Script
1. Copy entire content from `sql/create_storage_buckets.sql`
2. Paste into SQL editor
3. Click **Run**

### Step 3: Refresh Browser
1. Go back to your app
2. Press F5 to refresh
3. Try creating admin with image
4. ✅ Should work now!

---

## What This Script Does

✅ Creates 3 storage buckets:
   - `admin-profiles` (public)
   - `category-images` (public)
   - `receipt-exports` (private)

✅ Disables RLS on storage objects

✅ Creates public policies:
   - INSERT (upload)
   - SELECT (read)
   - DELETE (delete)
   - UPDATE (update)

✅ Enables RLS with public policies

---

## Testing

1. **Refresh browser** (F5)
2. **Click "Add New Admin"**
3. **Fill form:**
   - Name: Test Admin
   - Email: test@example.com
   - Phone: 1234567890
   - **Select profile image** ← Important!
4. **Click Submit**
5. ✅ Should upload successfully!

---

## Verify It Works

Check admin listing:
- [ ] Admin created
- [ ] Profile image uploaded
- [ ] Image shows in listing (circular avatar)
- [ ] No RLS errors

---

## If Still Not Working

**Try Manual Setup:**
1. Go to Supabase Storage
2. Click **New Bucket**
3. Name: `admin-profiles`
4. Choose: **Public bucket** ✅
5. Click **Create bucket**
6. Repeat for `category-images` and `receipt-exports`

---

## Important

⚠️ **Public Access for Development**
- Using public access for now
- Will add proper RLS policies later
- Keep this in mind for security

✅ **Image Storage**
- Images stored in Supabase storage
- URLs saved in database
- Shows in admin listing

---

## Files

- `sql/create_storage_buckets.sql` - Create buckets with public access
- `sql/enable_storage_public.sql` - Enable public policies

---

## Next Steps

1. ✅ Run `sql/create_storage_buckets.sql`
2. ✅ Test image upload
3. ✅ Verify images show in listing
4. ⏳ Continue with Phase 2 (admin permissions)

