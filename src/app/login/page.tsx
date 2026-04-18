'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      console.error('[login] signInWithOAuth error:', error.message)
      window.location.href = '/login?error=auth'
    }
  }

  const errorMessage =
    error === 'domain'
      ? 'Solo usuarios de BigSur Energy pueden acceder a esta plataforma.'
      : error === 'auth'
      ? 'Error de autenticación. Por favor intentá de nuevo.'
      : null

  return (
    <div className="flex h-screen items-center justify-center bg-[#F2F2F2]">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0A0A]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-black tracking-tight text-[#0A0A0A]">ContentOS</span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#D9D9D9] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mb-6">
            <h1 className="text-[22px] font-black leading-tight tracking-tight text-[#0A0A0A]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[#666666]">
              Sign in to manage your social content.
            </p>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
              <p className="text-[12.5px] text-red-600">{errorMessage}</p>
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#D9D9D9] bg-white px-4 py-2.5 text-[13.5px] font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:border-neutral-400 hover:-translate-y-px active:scale-[0.99]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-[12px] text-neutral-400">
            By continuing, you agree to our{' '}
            <span className="text-[#0A0A0A] cursor-pointer hover:underline font-medium">Terms of Service</span>
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] text-neutral-400">
          ContentOS · Social content, simplified
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
