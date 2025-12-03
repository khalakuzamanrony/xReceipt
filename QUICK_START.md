# xReceipt Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Set Up Database

**Choose one:**

**Option A: Fresh Setup** (New project)
- Go to Supabase SQL Editor
- Copy content from `sql/master.sql`
- Paste and run in SQL editor

**Option B: Safe Migration** (Existing database)
- Go to Supabase SQL Editor
- Copy content from `sql/safe_master.sql`
- Paste and run in SQL editor

Then create storage buckets:
- admin-profiles
- category-images
- receipt-exports

### 4. Start Dev Server
```bash
npm run dev
```

### 5. Open Browser
Visit: http://localhost:5173

---

## 📁 Project Structure

```
xReceipt/
├── docs/              # 📚 All documentation
├── sql/               # 🗄️ Database scripts
├── src/               # 💻 Source code
│   ├── components/    # React components
│   ├── services/      # API services
│   ├── types/         # TypeScript types
│   └── lib/           # Utilities
├── public/            # Static files
└── package.json       # Dependencies
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `docs/README.md` | Documentation index |
| `docs/DATABASE_SETUP.md` | Database setup guide |
| `docs/PROJECT_CHECKLIST.md` | Feature requirements |
| `docs/ADMIN_PAGE_SUMMARY.md` | Admin page details |
| `docs/UI_DESIGN_GUIDE.md` | Design system |

---

## 🛠️ Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## 🗄️ Database Setup

### Fresh Setup (New Project)
1. Run `sql/master.sql` in Supabase SQL Editor
2. Create storage buckets
3. Update `.env.local`

### Safe Migration (Existing Data)
1. Run `sql/safe_master.sql` in Supabase SQL Editor
2. Verify data integrity
3. Test application

---

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Set up environment variables
3. ✅ Set up database
4. ✅ Start dev server
5. ⏳ Test Admin Management page
6. ⏳ Build Products page
7. ⏳ Build Categories page
8. ⏳ Implement authentication

---

## 🆘 Troubleshooting

### Dev server won't start
```bash
npm install
npm run dev
```

### Tailwind CSS not working
- Check `postcss.config.js`
- Verify `@tailwindcss/postcss` is installed
- Restart dev server

### Database connection error
- Check `.env.local` credentials
- Verify Supabase project is active
- See `docs/DATABASE_SETUP.md`

---

## 📞 Need Help?

- **Setup issues** → `docs/SETUP.md`
- **Database issues** → `docs/DATABASE_SETUP.md`
- **Feature requirements** → `docs/PROJECT_CHECKLIST.md`
- **Design questions** → `docs/UI_DESIGN_GUIDE.md`
- **Progress tracking** → `docs/PROGRESS.md`

---

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

---

## ✨ Features

- ✅ Multi-user system (Super Admin & Admin)
- ✅ Receipt management
- ✅ Product & category management
- ✅ Permission-based access control
- ✅ PWA support (offline)
- ✅ Responsive design
- ✅ Modern UI with Radix UI

---

**Happy coding! 🚀**

