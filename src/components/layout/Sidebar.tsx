'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, LayoutList, Plus, LogOut, MonitorPlay, ClipboardCheck, ShieldCheck, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/types'

const ADMIN_NAV = [
  { href: '/posts',    label: 'Posts',    icon: LayoutList },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/preview',  label: 'Preview',  icon: MonitorPlay },
  { href: '/inbox',    label: 'Inbox',    icon: Inbox },
  { href: '/admin',    label: 'Admin',    icon: ShieldCheck },
]

const REVIEWER_NAV = [
  { href: '/review',            label: 'Revisar contenido', icon: ClipboardCheck },
  { href: '/reviewer-calendar', label: 'Calendario',        icon: CalendarDays   },
  { href: '/inbox',             label: 'Inbox',             icon: Inbox          },
]

interface Props {
  role: UserRole
}

export function Sidebar({ role }: Props) {
  const pathname = usePathname()
  const navItems = role === 'super_admin' ? ADMIN_NAV : REVIEWER_NAV

  function handleSignOut() {
    // POST to server route so httpOnly cookies are cleared properly
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col bg-[#EBEBEB] px-3 py-4 border-r border-[#D9D9D9]">
      {/* Logo */}
      <div className="mb-5 flex items-center gap-2 px-2 pt-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A0A0A]">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-[13.5px] font-black tracking-tight text-[#0A0A0A]">ContentOS</span>
      </div>

      {/* New post — only for super_admin */}
      {role === 'super_admin' && (
        <Link href="/posts/new" className="mb-4">
          <div className="flex items-center justify-center gap-1.5 rounded-full bg-[#111111] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-neutral-800 hover:-translate-y-px active:scale-[0.99]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New Post
          </div>
        </Link>
      )}

      {/* Role badge */}
      {role === 'reviewer' && (
        <div className="mb-4 rounded-lg bg-neutral-200/60 px-2.5 py-2 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Reviewer</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/posts' && href !== '/review' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all',
                isActive
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-neutral-500 hover:bg-[#E5E5E5] hover:text-[#0A0A0A]'
              )}
            >
              <Icon
                className={cn('h-[15px] w-[15px]', isActive ? 'text-[#0A0A0A]' : 'text-neutral-400')}
                strokeWidth={isActive ? 2 : 1.75}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-neutral-400 transition-all hover:bg-[#E5E5E5] hover:text-neutral-600"
      >
        <LogOut className="h-[15px] w-[15px]" strokeWidth={1.75} />
        Sign out
      </button>
    </aside>
  )
}
