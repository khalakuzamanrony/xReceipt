import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

type ToastState = {
  open: boolean
  title: string
  description: string
  variant: ToastVariant
  key: number
}

type ToastContextValue = {
  toast: (title: string, description?: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'info',
    key: 0,
  })

  const toast = useCallback((title: string, description = '', variant: ToastVariant = 'info') => {
    setState({ open: true, title, description, variant, key: Date.now() })
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPrimitive.Provider swipeDirection="right" duration={TOAST_DURATION}>
        <ToastPrimitive.Root
          key={state.key}
          open={state.open}
          onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
          className={cn(
            'group relative rounded-lg border px-4 py-3 shadow-lg bg-white text-sm flex flex-col gap-1 overflow-hidden',
            state.variant === 'success' && 'border-green-200',
            state.variant === 'error' && 'border-red-200',
            state.variant === 'info' && 'border-gray-200',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <ToastPrimitive.Title className="font-semibold text-gray-900">{state.title}</ToastPrimitive.Title>
              {state.description ? (
                <ToastPrimitive.Description className="text-gray-600">{state.description}</ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close asChild>
              <button
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </ToastPrimitive.Close>
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className={cn(
                'h-full origin-left animate-shrink',
                state.variant === 'success' && 'bg-green-500',
                state.variant === 'error' && 'bg-red-500',
                state.variant === 'info' && 'bg-gray-500',
              )}
              style={{ animationDuration: `${TOAST_DURATION}ms` }}
            />
          </div>
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-72 max-w-full outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
