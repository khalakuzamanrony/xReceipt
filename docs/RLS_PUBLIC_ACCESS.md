# RLS with Public Access

## Overview

Two new SQL files with RLS enabled and public access policies for development:

- `sql/master_with_rls.sql` - Fresh setup with public RLS
- `sql/safe_master_with_rls.sql` - Safe migration with public RLS

## What's Different

### Old Files (RLS Disabled)
```
- master.sql
- safe_master.sql
```
RLS is completely disabled.

### New Files (RLS Enabled - Public)
```
- master_with_rls.sql
- safe_master_with_rls.sql
```
RLS is enabled with public access policies (everyone can read/write/delete).

## How to Use

### Option 1: Fresh Setup with Public RLS

1. Go to Supabase SQL Editor
2. Copy entire content from `sql/master_with_rls.sql`
3. Paste and click Run

Creates all tables with RLS enabled and public access.

### Option 2: Safe Migration with Public RLS

1. Go to Supabase SQL Editor
2. Copy entire content from `sql/safe_master_with_rls.sql`
3. Paste and click Run

Updates existing database with RLS enabled and public access.

## Public RLS Policies

Each table has 4 policies:

```sql
CREATE POLICY "Public read access" ON table_name FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON table_name FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON table_name FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON table_name FOR DELETE USING (true);
```

This means:
- ✅ Anyone can SELECT (read)
- ✅ Anyone can INSERT (create)
- ✅ Anyone can UPDATE (modify)
- ✅ Anyone can DELETE (remove)

## For Development

Public access is perfect for development because:
- ✅ No authentication required
- ✅ No infinite recursion errors
- ✅ All operations work
- ✅ Easy testing

## For Production

⚠️ **DO NOT use public access in production!**

For production, you need:
1. Proper authentication setup
2. Role-based RLS policies
3. Restricted access based on user roles
4. Audit logging

See `docs/DATABASE_SETUP.md` for production RLS policies.

## Tables with Public RLS

All 7 tables have public access:
1. users
2. categories
3. products
4. receipt_templates
5. admin_permissions
6. receipts
7. receipt_items

## After Running

The application will:
- ✅ Load without RLS errors
- ✅ Allow all CRUD operations
- ✅ Work for development/testing
- ✅ Be ready for feature development

## Switching Back

If you want to disable RLS again:
1. Run `sql/disable_rls.sql`

If you want to use the original files:
1. Run `sql/master.sql` (RLS disabled)
2. Or `sql/safe_master.sql` (RLS disabled)

## File Summary

| File | RLS | Access | Use Case |
|------|-----|--------|----------|
| master.sql | Disabled | N/A | Fresh setup, no RLS |
| safe_master.sql | Disabled | N/A | Migration, no RLS |
| master_with_rls.sql | Enabled | Public | Fresh setup, with RLS |
| safe_master_with_rls.sql | Enabled | Public | Migration, with RLS |
| disable_rls.sql | - | - | Disable RLS if needed |

## Next Steps

1. Choose the right file for your situation
2. Run in Supabase SQL Editor
3. Refresh browser
4. Application should work!

