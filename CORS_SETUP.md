# CORS Configuration for Supabase

## Problem
You're getting CORS errors when trying to fetch data from Supabase:
```
Access to fetch at 'https://ennacgmobaeukhtvkxgi.supabase.co/rest/v1/...' 
has been blocked by CORS policy
```

## Solution - CORRECT METHOD

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Select your project `xReceipt`

### Step 2: Navigate to Settings
1. Click **Settings** (gear icon, bottom left sidebar)
2. In the left menu, click **API**

### Step 3: Find CORS Settings
Look for the section labeled **CORS** or **Allowed Origins**

You should see:
- A text input field for origins
- Current allowed origins list

### Step 4: Add Your Local Development URL
1. In the CORS input field, type: `http://localhost:5173`
2. Press Enter or click the **+** button to add it
3. Click **Save** (if there's a save button)

### Step 5: Restart Your Dev Server
1. Stop the dev server (Ctrl+C in terminal)
2. Run `npm run dev` again
3. Refresh your browser (F5)

## If You Can't Find CORS Settings

**Alternative Method - Using Supabase CLI:**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ennacgmobaeukhtvkxgi

# Update CORS settings
supabase secrets set CORS_ALLOWED_ORIGINS="http://localhost:5173"
```

## Expected Result
After CORS is configured, you should see:
- ✅ Data loading from Products, Categories, Admin, Templates pages
- ✅ No more CORS errors in console
- ✅ Hot reload working automatically when you save files

## Troubleshooting

**Still getting CORS errors?**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check that you added `http://localhost:5173` (not `https`)
4. Wait 30 seconds for changes to propagate
5. Check your Supabase project URL matches: `ennacgmobaeukhtvkxgi.supabase.co`

**Can't find CORS in Settings?**
- Your Supabase plan might not have CORS settings visible
- Try the CLI method above
- Or contact Supabase support
