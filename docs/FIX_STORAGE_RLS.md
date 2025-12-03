# Fix Storage RLS - Enable Public Upload

## Problem
```
Storage upload failed: StorageApiError: new row violates row-level security policy
```

Storage buckets have RLS policies blocking uploads. You need to disable RLS on storage buckets.

---

## Solution

### Step 1: Go to Supabase Storage Settings

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **Storage** in left sidebar
4. Click **Policies** tab (or gear icon)

### Step 2: Disable RLS on Storage Buckets

For each bucket (`admin-profiles`, `category-images`, `receipt-exports`):

1. Click the bucket name
2. Look for **Row Level Security** or **RLS** toggle
3. **Turn OFF / Disable RLS**
4. Confirm the action

### Step 3: Create Public Access Policy (Alternative)

If you can't disable RLS, create a public policy:

1. Click bucket name
2. Click **Policies** tab
3. Click **New Policy**
4. Select **For full customization, use custom policies**
5. Create policy:

```sql
CREATE POLICY "Public upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'admin-profiles');

CREATE POLICY "Public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'admin-profiles');
```

Repeat for each bucket.

---

## Quick Fix Steps

1. **Go to Supabase Dashboard**
2. **Storage → Policies**
3. **For each bucket:**
   - Disable RLS
   - Or create public policy
4. **Refresh browser**
5. **Try uploading image again**

---

## After Fix

- ✅ Image uploads will work
- ✅ Admin creation with image will succeed
- ✅ Profile images saved to storage
- ✅ Image URLs saved to database

---

## If Still Not Working

Check:
- [ ] Bucket exists in Storage
- [ ] RLS is disabled on bucket
- [ ] Bucket is set to Public
- [ ] Storage policies allow INSERT
- [ ] Supabase project is active

---

## Testing

1. Refresh browser
2. Click "Add New Admin"
3. Fill form
4. Select profile image
5. Click Submit
6. ✅ Should upload successfully!

