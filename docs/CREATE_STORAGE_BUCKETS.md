# Create Storage Buckets in Supabase

## Error
```
POST https://ennacgmobaeukhtvkxgi.supabase.co/storage/v1/object/admin-profiles/new-1764788937259 400 (Bad Request)
```

Storage buckets don't exist. You need to create them manually.

---

## How to Create Buckets

### Step 1: Open Supabase Storage
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **Storage** in left sidebar

### Step 2: Create First Bucket - admin-profiles

1. Click **New Bucket** button
2. Enter name: `admin-profiles`
3. Choose: **Public bucket** ✅
4. Click **Create bucket**

### Step 3: Create Second Bucket - category-images

1. Click **New Bucket** button
2. Enter name: `category-images`
3. Choose: **Public bucket** ✅
4. Click **Create bucket**

### Step 4: Create Third Bucket - receipt-exports

1. Click **New Bucket** button
2. Enter name: `receipt-exports`
3. Choose: **Private bucket** (for exports)
4. Click **Create bucket**

---

## Bucket Details

| Bucket | Type | Purpose |
|--------|------|---------|
| admin-profiles | Public | Admin profile images |
| category-images | Public | Category images |
| receipt-exports | Private | Exported receipts (PDF/PNG) |

---

## After Creating Buckets

1. Refresh your browser
2. Try uploading a profile image again
3. Should work now! ✅

---

## Troubleshooting

### Error: "Bucket already exists"
→ Good! Just use it. Skip to next bucket.

### Error: "Cannot upload"
→ Make sure bucket is **Public** for admin-profiles and category-images

### Error: "Permission denied"
→ Check bucket is set to Public access

---

## Storage Bucket Policies

### Public Buckets (admin-profiles, category-images)
- Anyone can upload
- Anyone can download
- Anyone can delete

### Private Bucket (receipt-exports)
- Only authenticated users can access
- For sensitive exports

---

## Next Steps

1. ✅ Create 3 storage buckets
2. ✅ Refresh browser
3. ✅ Try uploading profile image
4. ✅ Should work!

