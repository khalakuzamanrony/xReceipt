import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

type ToastState = {
  open: boolean
  title: string
  description: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (title: string, description?: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'info',
  })

  const toast = useCallback((title: string, description = '', variant: ToastVariant = 'info') => {
    setState({ open: true, title, description, variant })
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        <ToastPrimitive.Root
          open={state.open}
          onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
          className={cn(
            'rounded-lg border px-4 py-3 shadow-lg bg-white text-sm flex flex-col gap-1',
            state.variant === 'success' && 'border-green-200',
            state.variant === 'error' && 'border-red-200',
            state.variant === 'info' && 'border-gray-200',
          )}
        >
          <ToastPrimitive.Title className="font-semibold text-gray-900">{state.title}</ToastPrimitive.Title>
          {state.description ? (
            <ToastPrimitive.Description className="text-gray-600">{state.description}</ToastPrimitive.Description>
          ) : null}
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-72 max-w-full outline-none" />
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
