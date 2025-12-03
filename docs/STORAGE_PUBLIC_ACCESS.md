# Enable Public Storage Access - Complete Guide

## Problem
```
Storage upload failed: StorageApiError: new row violates row-level security policy
```

Storage buckets have RLS blocking uploads. Need to enable public access.

---

## Solution 1: Run SQL Script (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Run Storage Public Access Script
1. Copy entire content from `sql/enable_storage_public.sql`
2. Paste into SQL editor
3. Click **Run**

### Step 3: Refresh Browser
1. Go back to your app
2. Press F5 to refresh
3. Try uploading profile image
4. ✅ Should work now!

---

## Solution 2: Manual Configuration (If SQL doesn't work)

### Step 1: Go to Storage Settings
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **Storage** in left sidebar

### Step 2: Create Buckets (if not exist)
For each bucket:
1. Click **New Bucket**
2. Name: `admin-profiles` or `category-images` or `receipt-exports`
3. Choose: **Public bucket** ✅
4. Click **Create bucket**

### Step 3: Disable RLS on Buckets
For each bucket:
1. Click bucket name
2. Click **Policies** tab
3. Look for **Row Level Security** toggle
4. **Turn OFF / Disable RLS**
5. Confirm

### Step 4: Create Public Policies
If RLS can't be disabled, create policies:

1. Click bucket name
2. Click **Policies** tab
3. Click **New Policy**
4. Select **For full customization, use custom policies**
5. Create policy:

```sql
CREATE POLICY "Public upload" ON storage.objects
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read" ON storage.objects
  FOR SELECT
  USING (true);

CREATE POLICY "Public delete" ON storage.objects
  FOR DELETE
  USING (true);
```

---

## After Enabling Public Access

✅ Image uploads will work
✅ Admin creation with image succeeds
✅ Profile images saved to storage
✅ Image URLs saved to database
✅ Admin listing shows profile images

---

## Testing

1. **Refresh browser** (F5)
2. **Click "Add New Admin"**
3. **Fill form:**
   - Name
   - Email
   - Phone (optional)
   - **Select profile image** ← Important!
4. **Click Submit**
5. ✅ Should upload and save successfully!

---

## Verify It Works

Check admin listing:
- [ ] Admin name shows
- [ ] Admin email shows
- [ ] **Profile image shows** (circular avatar)
- [ ] If no image, shows initials avatar

---

## Important Notes

⚠️ **Development Only**
- Public access is fine for development
- Later will add proper RLS policies for production
- Keep this in mind for security

✅ **Image Storage**
- Images stored in Supabase storage
- URLs saved in admin profile
- Accessible from admin listing

---

## Troubleshooting

### Still getting RLS error?
- [ ] Verify buckets exist in Storage
- [ ] Verify RLS is disabled on buckets
- [ ] Verify policies allow INSERT
- [ ] Try running SQL script again
- [ ] Check Supabase project is active

### Image not showing in listing?
- [ ] Verify image uploaded successfully
- [ ] Check browser console for errors
- [ ] Verify image URL is valid
- [ ] Try refreshing page

### Upload succeeds but URL not saved?
- [ ] Check admin was created in database
- [ ] Verify profile_image_url column exists
- [ ] Check for database errors in console

---

## Files

- `sql/enable_storage_public.sql` - SQL script to enable public access
- `docs/STORAGE_PUBLIC_ACCESS.md` - This guide

---

## Next Steps

1. ✅ Enable public storage access
2. ✅ Test image upload
3. ✅ Verify admin listing shows images
4. ⏳ Later: Add proper RLS policies for production

