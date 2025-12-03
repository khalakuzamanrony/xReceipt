# Fix RLS Errors

## Problem

You're seeing errors like:
```
infinite recursion detected in policy for relation "users"
new row violates row-level security policy
```

This means RLS (Row Level Security) policies are enabled and blocking access.

## Solution

### Step 1: Disable RLS in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy entire content from `sql/disable_rls.sql`
6. Paste into SQL editor
7. Click **Run**

This will:
- ✅ Disable RLS on all tables
- ✅ Drop all RLS policies
- ✅ Allow data operations to work

### Step 2: Verify

After running the script:
1. Go back to your browser
2. Refresh the page
3. Try clicking "Add New Admin" button
4. Form should load without errors
5. You should be able to create an admin

## Why This Happened

The old SQL schema had RLS policies that caused infinite recursion. The new `master.sql` and `safe_master.sql` have RLS disabled, but if you ran an older version first, the policies are still active in your database.

## Files

- `sql/disable_rls.sql` - Disables RLS and drops all policies
- `sql/master.sql` - Fresh setup (RLS disabled)
- `sql/safe_master.sql` - Safe migration (RLS disabled)

## After Fixing

Once RLS is disabled:
1. ✅ Admin form will load
2. ✅ Products/categories/templates will load
3. ✅ You can create admins
4. ✅ You can upload images
5. ✅ Everything works!

## For Production

When you're ready for production:
1. Set up proper authentication
2. Create proper RLS policies
3. Enable RLS on tables
4. Test thoroughly

For now, development works better with RLS disabled.

