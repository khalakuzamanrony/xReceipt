# Supabase Setup Instructions

## Quick Start

### Step 1: Run Database Schema

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your xReceipt project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy entire content from `/sql/master.sql`
6. Paste into SQL editor
7. Click **Run**

✅ This creates all tables, indexes, and triggers

### Step 2: Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket** for each:
   - `admin-profiles` (Public)
   - `category-images` (Public)
   - `receipt-exports` (Private)

### Step 3: Update Environment Variables

Create `.env.local` file:
```
VITE_SUPABASE_URL=https://ennacgmobaeukhtvkxgi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVubmFjZ21vYmFldWtodHZreGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDg1ODMsImV4cCI6MjA3OTYyNDU4M30.pmI0sdv7UXS4VR_Q_HBjRGOKhmbVsuTEDPWgNOT0dWc
```

### Step 4: Test Connection

The application will automatically test the connection when you:
1. Click "Add New Admin" button
2. The form will load and try to fetch products/categories/templates

---

## Database Schema

### Tables Created

| Table | Purpose |
|-------|---------|
| `users` | User accounts (super_admin, admin) |
| `categories` | Product categories |
| `products` | Product catalog |
| `receipt_templates` | Receipt design templates |
| `admin_permissions` | Admin access control |
| `receipts` | Generated receipts |
| `receipt_items` | Line items in receipts |

### Indexes Created

Performance indexes for:
- Email lookups
- Role filtering
- Category filtering
- Template lookups
- Receipt searches
- Date filtering

### Triggers

Automatic `updated_at` timestamp updates on:
- users
- categories
- products
- receipt_templates
- admin_permissions
- receipts

---

## Row Level Security (RLS)

**Current Status:** Disabled for development

RLS policies are commented out in `master.sql` to allow development without authentication setup.

### To Enable RLS in Production

1. Uncomment RLS policies in `sql/master.sql`
2. Set up proper authentication
3. Test all access controls
4. Deploy to production

---

## Storage Buckets

### admin-profiles
- **Purpose:** Admin profile images
- **Access:** Public
- **Path:** `{admin_id}-{timestamp}`

### category-images
- **Purpose:** Category images
- **Access:** Public
- **Path:** `{category_id}-{timestamp}`

### receipt-exports
- **Purpose:** Exported receipts (PDF, PNG)
- **Access:** Private
- **Path:** `{user_id}/{receipt_id}-{timestamp}`

---

## Troubleshooting

### Error: "infinite recursion detected in policy"
- RLS policies are enabled but not properly configured
- Use the updated `master.sql` which disables RLS for development

### Error: "relation does not exist"
- Tables haven't been created
- Run `sql/master.sql` in Supabase SQL Editor

### Error: "storage bucket does not exist"
- Create storage buckets manually in Supabase UI
- Or use Supabase API to create them

### Error: "permission denied"
- RLS policies are blocking access
- Disable RLS for development
- Or configure proper authentication

---

## Next Steps

1. ✅ Run `sql/master.sql`
2. ✅ Create storage buckets
3. ✅ Update `.env.local`
4. ⏳ Test Admin Management page
5. ⏳ Create test admin
6. ⏳ Build Products page
7. ⏳ Build Categories page
8. ⏳ Implement authentication

---

## Important Notes

- **Development:** RLS is disabled for easier development
- **Production:** Enable RLS and set up proper authentication
- **Storage:** Create buckets with appropriate access levels
- **Backups:** Always backup before running migrations
- **Testing:** Test on staging environment first

