import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { PostSlideOver } from '@/components/posts/PostSlideOver'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F2F2]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden rounded-tl-xl bg-white shadow-[-1px_0_0_0_#D9D9D9]">
        {children}
      </main>
      <PostSlideOver />
    </div>
  )
}
