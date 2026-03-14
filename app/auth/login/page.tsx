'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLeftPanel from '@/components/custom/AuthLeftPanel'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function getLoginErrorMessage(message: string) {
    const normalized = message.toLowerCase()
    if (normalized.includes('failed to fetch') || normalized.includes('network')) {
      return 'Network error. Please check your internet connection and try again.'
    }
    if (normalized.includes('email not confirmed')) {
      return 'Your email is not yet confirmed.'
    }
    if (normalized.includes('invalid login credentials')) {
      return 'Incorrect email or password.'
    }
    return 'Unable to sign in right now. Please try again.'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError) {
        setError(getLoginErrorMessage(authError.message || ''))
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_suspended')
        .eq('id', data.user.id)
        .single()

      if (profile?.is_suspended) {
        await supabase.auth.signOut()
        router.push('/auth/suspended')
        return
      }

      if (profile?.role === 'admin') {
        router.push('/dashboard/admin')
      } else if (profile?.role === 'client') {
        router.push('/dashboard/client')
      } else {
        router.push('/dashboard/agent')
      }
    } catch {
      setError('Network error. Please check your internet connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <AuthLeftPanel />

      {/* Right Panel */}
      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-5xl text-midnight mb-2 leading-tight font-display">
              Bon retour
            </h1>
            <p className="text-gray-500 font-body">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-500 font-heading">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@example.com"
                  required
                  disabled={loading}
                  className="pl-10 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-500 font-heading">Password</Label>
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
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm font-body">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal hover:bg-teal/90 text-white font-heading py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-px"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <div className="text-center">
              <Link href="/auth/forgot-password" className="text-sm text-teal hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p className="font-body">Don't have an account? <a href="/auth/signup" className="text-teal hover:underline font-medium">Create an account</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
