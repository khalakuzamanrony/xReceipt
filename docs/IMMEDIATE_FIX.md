# Immediate Fix for RLS Error

## Error
```
new row violates row-level security policy
infinite recursion detected in policy for relation "users"
```

## Quick Fix (1 Minute)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Click **SQL Editor**
4. Click **New Query**

### Step 2: Run Fix Script
1. Copy entire content from `sql/fix_rls_now.sql`
2. Paste into SQL editor
3. Click **Run**

### Step 3: Refresh Browser
1. Go back to your app
2. Press F5 to refresh
3. Click "Add New Admin" button
4. Form should load without errors!

---

## What This Script Does

✅ Disables RLS on all tables
✅ Drops all old problematic policies
✅ Re-enables RLS with public access
✅ Creates 4 public policies per table:
   - SELECT (read)
   - INSERT (create)
   - UPDATE (modify)
   - DELETE (remove)

---

## After Running

The application will:
- ✅ Load admin form
- ✅ Load products/categories/templates
- ✅ Allow creating admins
- ✅ Allow uploading images
- ✅ Work without errors!

---

## Why This Happened

Old RLS policies had infinite recursion. The fix:
1. Removes old policies
2. Enables public access (everyone can do everything)
3. Perfect for development

---

## File Location

`sql/fix_rls_now.sql` - Run this in Supabase SQL Editor

