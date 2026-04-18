import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const ALLOWED_DOMAIN = '@bigsur.energy'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    console.error('[auth/callback] No user after exchange')
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const email = user.email.toLowerCase().trim()
  const isAllowed = email === SUPER_ADMIN_EMAIL.toLowerCase() || email.endsWith(ALLOWED_DOMAIN)

  if (!isAllowed) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  const role = email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'reviewer'
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      { id: user.id, email, full_name: fullName, role },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  if (profileError) {
    console.error('[auth/callback] upsert failed:', profileError.message, profileError.code)
  }

  const redirectPath = role === 'reviewer' ? '/review' : '/posts'
  const response = NextResponse.redirect(`${origin}${redirectPath}`)

  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
