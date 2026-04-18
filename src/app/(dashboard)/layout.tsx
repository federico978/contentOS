import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { PostSlideOver } from '@/components/posts/PostSlideOver'
import { ProfileStoreInitializer } from '@/components/layout/ProfileStoreInitializer'
import { UserRole } from '@/lib/types'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

const ADMIN_ONLY_PREFIX = ['/posts', '/calendar', '/preview', '/admin']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = (user.email ?? '').toLowerCase().trim()

  // ── Determine role ────────────────────────────────────────────────────────
  // Priority: cookie → DB profile → email fallback
  const cookieStore = await cookies()
  const roleCookie  = cookieStore.get('user_role')?.value

  let role: UserRole = email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'reviewer'

  if (roleCookie === 'super_admin' || roleCookie === 'reviewer') {
    role = roleCookie
  } else {
    // Cookie missing — try DB (table might not exist yet, so we ignore errors)
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin' || profile?.role === 'reviewer') {
        role = profile.role
      } else {
        // Profile row doesn't exist yet (user logged in before the table was created).
        // Create it now so subsequent queries work correctly.
        const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
        await supabase
          .from('user_profiles')
          .upsert({ id: user.id, email, full_name: fullName, role }, { onConflict: 'id' })
      }
    } catch {
      // user_profiles table not created yet — fall back to email-based default
    }
  }

  // ── Role-based path guards (safety net if proxy cookie isn't set yet) ─────
  const headersList = await headers()
  const pathname    = headersList.get('x-pathname') ?? ''

  if (pathname && role === 'reviewer') {
    const isAdminPath = ADMIN_ONLY_PREFIX.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
    if (isAdminPath) redirect('/review')
  }

  if (pathname && role === 'super_admin') {
    const isReviewPath = pathname === '/review' || pathname.startsWith('/review/')
    if (isReviewPath) redirect('/posts')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F2F2]">
      <ProfileStoreInitializer role={role} userId={user.id} email={email} />
      <Sidebar role={role} />
      <main className="flex flex-1 flex-col overflow-hidden rounded-tl-xl bg-white shadow-[-1px_0_0_0_#D9D9D9]">
        {children}
      </main>
      <PostSlideOver />
    </div>
  )
}
