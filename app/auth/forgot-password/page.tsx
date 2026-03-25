'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2 } from 'lucide-react'

const AuthLeftPanel = dynamic(() => import('@/components/custom/AuthLeftPanel'), { ssr: false })

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.somnoventis.com/auth/reset-password',
      })

      if (resetError) {
        const shouldUseServerFallback = /captcha/i.test(resetError.message || '')

        if (!shouldUseServerFallback) {
          setError(resetError.message || 'Unable to send reset link. Please try again.')
          setLoading(false)
          return
        }

        const fallback = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (!fallback.ok) {
          const fallbackData = await fallback.json().catch(() => null)
          setError(fallbackData?.error || 'Unable to send reset link. Please try again.')
          setLoading(false)
          return
        }
      }

      setSuccess('A reset link has been sent to your email address.')
      setLoading(false)
    } catch {
      try {
        const fallback = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (fallback.ok) {
          setSuccess('A reset link has been sent to your email address.')
          setLoading(false)
          return
        }

        const fallbackData = await fallback.json().catch(() => null)
        setError(fallbackData?.error || 'Unable to send reset link. Please try again.')
      } catch {
        setError('Unable to send reset link (network error). Please try again.')
      }

      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />

      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-5xl text-midnight mb-2 leading-tight font-display">Forgot password</h1>
            <p className="text-gray-500 font-body">Enter your email address to receive a password reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-500 font-heading">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                  className="pl-10 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm font-body">{error}</div>}
            {success && <div className="text-emerald-600 text-sm font-body">{success}</div>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal hover:bg-teal/90 text-white font-heading py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-px"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}