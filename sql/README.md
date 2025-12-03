# SQL Scripts

This folder contains SQL scripts for xReceipt database setup and management.

## Quick Reference

| File | Purpose | When to Use |
|------|---------|-----------|
| `master.sql` | Fresh database setup | New projects, no existing data |
| `safe_master.sql` | Safe database migration | Updating existing databases, preserve data |

---

## Files

### `master.sql` - Fresh Database Setup

**Purpose:** Create a brand new xReceipt database from scratch

**Use this when:**
- ✅ Starting a new xReceipt project
- ✅ No existing data in the database
- ✅ Fresh installation

**Contains:**
- All 7 table definitions
- Performance indexes
- Automatic timestamp triggers
- RLS disabled for development
- DROP TRIGGER IF EXISTS for safety

**How to use:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy entire content of `master.sql`
6. Paste into SQL editor
7. Click **Run**

---

### `safe_master.sql` - Safe Database Migration

**Purpose:** Update existing database while preserving all data

**Use this when:**
- ✅ Updating an existing xReceipt database
- ✅ Adding new features
- ✅ Migrating from older version
- ✅ Want to keep existing data intact

**Contains:**
- `CREATE TABLE IF NOT EXISTS` - Won't overwrite existing tables
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` - Won't fail if column exists
- `DROP TRIGGER IF EXISTS` - Safe trigger recreation
- All new tables and features
- Preserves all existing data

**How to use:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy entire content of `safe_master.sql`
6. Paste into SQL editor
7. Click **Run**

---

## Key Differences

### master.sql
```sql
CREATE TABLE users (...)           -- Creates fresh table
CREATE TRIGGER ... (...)           -- Creates trigger
```

### safe_master.sql
```sql
CREATE TABLE IF NOT EXISTS users (...) -- Won't fail if exists
DROP TRIGGER IF EXISTS ... (...)       -- Safely recreates
CREATE TRIGGER ... (...)               -- Creates trigger
```

---

## Safety Features

Both files include:
- ✅ `DROP TRIGGER IF EXISTS` - Prevents "trigger already exists" error
- ✅ RLS disabled - For development without authentication
- ✅ All indexes - For performance
- ✅ All triggers - For automatic timestamps
- ✅ Safe to run multiple times

---

## Database Schema

### Tables Created
1. users
2. categories
3. products
4. receipt_templates
5. admin_permissions
6. receipts
7. receipt_items

### Indexes
- Email lookups
- Role filtering
- Category filtering
- Template lookups
- Receipt searches
- Date filtering

### Triggers
- Automatic `updated_at` timestamps on all tables

---

## Troubleshooting

### Error: "relation does not exist"
→ Tables haven't been created. Run `master.sql` first.

### Error: "trigger already exists"
→ Fixed! Both files now use `DROP TRIGGER IF EXISTS`

### Error: "column already exists"
→ Use `safe_master.sql` which uses `IF NOT EXISTS`

### Error: "infinite recursion in policy"
→ Fixed! RLS policies are now disabled for development

---

## Next Steps

1. Choose the right file for your situation
2. Run in Supabase SQL Editor
3. Create storage buckets
4. Update `.env.local`
5. Test the application

---

## Database Schema

### Tables Created

1. **users** - User accounts (super_admin, admin)
2. **categories** - Product categories
3. **products** - Product catalog
4. **receipt_templates** - Receipt design templates
5. **admin_permissions** - Admin access control
6. **receipts** - Generated receipts
7. **receipt_items** - Line items in receipts

### Storage Buckets Required

1. **admin-profiles** - Admin profile images
2. **category-images** - Category images
3. **receipt-exports** - Exported receipts (PDF, PNG)

---

## Quick Start

### New Project
```bash
# 1. Copy master.sql content
# 2. Paste into Supabase SQL Editor
# 3. Click Run
# 4. Create storage buckets in Supabase UI
# 5. Update .env.local with credentials
```

### Existing Project
```bash
# 1. Copy safe_master.sql content
# 2. Paste into Supabase SQL Editor
# 3. Click Run
# 4. Verify data integrity
# 5. Test application
```

---

## Important Notes

⚠️ **Backup Your Data**
- Always backup your database before running migrations
- Test on a staging environment first
- Keep a copy of your current schema

✅ **RLS is Enabled**
- All tables have Row Level Security enabled
- Policies are configured for security
- Test access controls after setup

✅ **Indexes Are Created**
- Performance indexes are automatically created
- No manual index creation needed
- Improves query performance

✅ **Triggers Are Set**
- `updated_at` timestamps are automatic
- Triggers handle timestamp updates
- No manual timestamp management needed

---

## Troubleshooting

### Error: "relation does not exist"
The tables haven't been created. Run `master.sql` first.

### Error: "permission denied"
Check RLS policies and user authentication.

### Error: "duplicate key value"
A unique constraint was violated. Check for duplicates.

### Data not showing
Verify RLS policies allow access for your user role.

---

## For More Information

See `docs/DATABASE_SETUP.md` for detailed setup instructions and troubleshooting.

