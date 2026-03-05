import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { VendorProvider } from './contexts/VendorContext'
import { BrandSettingsProvider } from './contexts/BrandSettingsContext'
import { ToastProvider } from './contexts/ToastContext'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <AuthProvider>
      <VendorProvider>
        <BrandSettingsProvider>
          <App />
        </BrandSettingsProvider>
      </VendorProvider>
    </AuthProvider>
  </ToastProvider>,
)

// In development, make sure no service workers are controlling the app
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch(() => {
        // Ignore unregister errors in dev
      })
    })
  })
}

// Register service worker for PWA (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('Service Worker registration failed:', error)
    })
  })
}
