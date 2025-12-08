import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import { adminService } from '@/services/adminService'

export default function SignInPage() {
  const { signIn, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setResetError('Please enter your email first.')
      setResetMessage(null)
      return
    }

    setResetLoading(true)
    setResetMessage(null)
    setResetError(null)

    try {
      await adminService.sendPasswordResetEmail(email)
      setResetMessage('If an account exists for this email, a reset link has been sent.')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-900 text-center">Sign in</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CardContent className="space-y-4 pt-0">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-sm pr-10 pr-16"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0 pb-4 px-6">
            <div className="flex flex-col items-stretch gap-2 w-full">
              <Button
                type="submit"
                size="sm"
                className="w-full h-9 text-xs font-semibold"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline self-center"
              >
                {resetLoading ? 'Sending reset email...' : 'Forgot password?'}
              </button>
              {resetMessage && (
                <p className="text-[11px] text-green-600 text-center">{resetMessage}</p>
              )}
              {resetError && (
                <p className="text-[11px] text-red-600 text-center">{resetError}</p>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
