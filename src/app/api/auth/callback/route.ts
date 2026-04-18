import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

const ALLOWED_DOMAIN = '@bigsur.energy'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/posts'

  if (!code) {
    console.error('[auth/callback] No code in searchParams')
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const cookieStore = await cookies()

  // Crear cliente propio (no el compartido de server.ts) para que los
  // Set-Cookie de la sesión se apliquen correctamente al response.
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          // Guardar las cookies para luego ponerlas en la respuesta redirect
          toSet.forEach((c) => cookiesToSet.push(c))
        },
      },
    },
  )

  // ── Intercambiar código por sesión ────────────────────────────────────────
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // ── Obtener usuario ───────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    console.error('[auth/callback] No user after exchange')
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const email = user.email.toLowerCase().trim()

  // ── Verificar dominio ─────────────────────────────────────────────────────
  const isAllowed =
    email === SUPER_ADMIN_EMAIL.toLowerCase() || email.endsWith(ALLOWED_DOMAIN)

  if (!isAllowed) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  // ── Upsert perfil ─────────────────────────────────────────────────────────
  const role     = email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'reviewer'
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      { id: user.id, email, full_name: fullName, role },
      { onConflict: 'id', ignoreDuplicates: false },
    )

  if (profileError) {
    console.error('[auth/callback] upsert failed:', profileError.message, profileError.code)
  }

  // ── Redirigir con cookies de sesión ───────────────────────────────────────
  const redirectUrl = role === 'reviewer' ? `${origin}/review` : `${origin}${next}`
  const response    = NextResponse.redirect(redirectUrl)

  // Aplicar las cookies de sesión de Supabase al redirect
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })

  // Cookie de rol para el proxy
  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30,
  })

  return response
}
