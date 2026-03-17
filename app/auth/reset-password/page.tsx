'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

const AuthLeftPanel = dynamic(() => import('@/components/custom/AuthLeftPanel'), { ssr: false })

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verifyRecoveryToken() {
      setError(null)

      // Case 1: PKCE flow — token_hash in query params
      const query = new URLSearchParams(window.location.search)
      const tokenHash = query.get('token_hash')
      const type = query.get('type')

      if (tokenHash && type === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (verifyError) {
          setError('Invalid or expired reset link.')
          setVerifying(false)
          return
        }

        setSessionReady(true)
        setVerifying(false)
        return
      }

      // Case 2: Implicit flow — access_token + refresh_token in hash fragment
      const hash = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          setError('Invalid or expired reset link.')
          setVerifying(false)
          return
        }

        setSessionReady(true)
        setVerifying(false)
        return
      }

      // Case 3: Session already active (e.g. page reloaded)
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSessionReady(true)
      } else {
        setError('Invalid or expired reset link.')
      }
      setVerifying(false)
    }

    void verifyRecoveryToken()
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!sessionReady) {
      setError('Invalid reset session. Please request a new link.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Unable to update password. Please try again.')
      setLoading(false)
      return
    }

    setSuccess('Password updated successfully. Redirecting to login...')
    setLoading(false)

    setTimeout(() => {
      router.push('/auth/login')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />

      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-5xl text-midnight mb-2 leading-tight font-display">Reset your password</h1>
            <p className="text-gray-500 font-body">Choose a new secure password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-500 font-heading">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="pl-10 pr-10 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-gray-500 font-heading">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="pl-10 pr-10 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm font-body">{error}</div>}
            {success && <div className="text-emerald-600 text-sm font-body">{success}</div>}
            {verifying && <div className="text-gray-500 text-sm font-body">Verifying reset link...</div>}

            <Button
              type="submit"
              disabled={loading || verifying || !sessionReady}
              className="w-full bg-teal hover:bg-teal/90 text-white font-heading py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-px"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}