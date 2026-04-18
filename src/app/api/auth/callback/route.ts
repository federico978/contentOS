import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

const ALLOWED_DOMAIN = '@bigsur.energy'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/posts'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const email = user.email.toLowerCase().trim()

  // ── Domain check ─────────────────────────────────────────────────────────
  const isAllowed =
    email === SUPER_ADMIN_EMAIL.toLowerCase() || email.endsWith(ALLOWED_DOMAIN)

  if (!isAllowed) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  // ── Upsert user profile ──────────────────────────────────────────────────
  const role = email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'reviewer'
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      { id: user.id, email, full_name: fullName, role },
      { onConflict: 'id', ignoreDuplicates: false },
    )
  if (profileError) {
    console.error('[auth/callback] user_profiles upsert failed:', profileError.message, profileError.code)
  }

  // ── Set role cookie and redirect ─────────────────────────────────────────
  const redirectUrl = role === 'reviewer' ? `${origin}/review` : `${origin}${next}`
  const response    = NextResponse.redirect(redirectUrl)

  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 days
  })

  return response
}
