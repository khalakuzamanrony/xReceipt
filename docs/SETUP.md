# xReceipt - PWA Receipt Generator Setup

## Project Overview
xReceipt is a Progressive Web App (PWA) for creating and managing receipts for your online shop.

**Tech Stack:**
- React 19 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Radix UI (component library)
- Supabase (database)

## Environment Setup

### 1. Create `.env.local` file
Copy the `.env.example` file and create `.env.local`:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://ennacgmobaeukhtvkxgi.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable React components
├── lib/              # Utility functions and Supabase client
├── types/            # TypeScript type definitions
├── App.tsx           # Main app component
├── index.css         # Global styles (Tailwind)
└── main.tsx          # Entry point
```

## PWA Features

- Service Worker for offline support
- Web App Manifest for installability
- Responsive design for mobile and desktop
- Works offline with cached assets

## Next Steps

Ready to build pages according to your plan. Let me know what pages/features you'd like to implement:
- Receipt creation form
- Receipt list/history
- Receipt preview/print
- Settings
- etc.
