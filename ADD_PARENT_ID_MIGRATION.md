# Add parent_id Column to Categories Table

## Problem
The `categories` table is missing the `parent_id` column needed for parent-child category hierarchy.

## Solution
Run this SQL in your Supabase SQL Editor to add the column:

### Step 1: Add the parent_id column
```sql
ALTER TABLE categories
ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
```

### Step 2: Create an index for better query performance
```sql
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
```

### Step 3: Verify the column was added
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
```

## How to Execute in Supabase

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL above
5. Click "Run" button
6. You should see "Success" message

## After Migration

Once the column is added, you can:
- Create root categories (parent_id = NULL)
- Create subcategories by setting parent_id to a parent category's ID
- The category hierarchy will work as expected in the app

## Rollback (if needed)
If you need to undo this change:
```sql
DROP INDEX idx_categories_parent_id;
ALTER TABLE categories DROP COLUMN parent_id;
```
