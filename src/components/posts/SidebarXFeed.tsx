'use client'

import { Heart, MessageCircle, Repeat2, BarChart2 } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

interface Props {
  posts: PostWithDetails[]
}

export function SidebarXFeed({ posts }: Props) {
  const xPosts = posts
    .filter((p) =>
      p.post_channels.some((pc) => {
        if (pc.channel?.slug !== 'x') return false
        return !!(pc.scheduled_at || p.scheduled_at)
      })
    )
    .sort((a, b) => {
      const pcA   = a.post_channels.find((pc) => pc.channel?.slug === 'x')
      const pcB   = b.post_channels.find((pc) => pc.channel?.slug === 'x')
      const dateA = pcA?.scheduled_at || a.scheduled_at
      const dateB = pcB?.scheduled_at || b.scheduled_at
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

  return (
    <div>
      <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
        Feed de X
      </p>

      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
        {/* Profile header */}
        <div className="flex items-center gap-2.5 border-b border-[#E5E5E5] px-3 py-3">
          <BigSurAvatar size={36} />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[12px] font-bold text-neutral-900 leading-tight">BigSur Energy</p>
              <svg className="h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1-2.52-1.26-3.91-.8-.66-1.31-2-2.2-3.34-2.2-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1 1.01-1.26 2.52-.8 3.91-1.31.66-2.2 2-2.2 3.34 0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1 2.52 1.26 3.91.8.66 1.31 2 2.2 3.34 2.2 1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1-1.01 1.26-2.52.8-3.91 1.31-.67 2.2-2 2.2-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            </div>
            <p className="text-[10.5px] text-neutral-500 leading-tight">@bigsur_energy</p>
          </div>
        </div>

        {xPosts.length === 0 ? (
          <div className="flex h-28 items-center justify-center px-4 text-center">
            <p className="text-[11.5px] text-neutral-400">No hay posts con X asignado</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {xPosts.map((post) => {
              const pc    = post.post_channels.find((c) => c.channel?.slug === 'x')
              const copy  = pc?.copy_override || post.copy
              const media = post.media_files?.find((m) => m.type !== 'cover')
              const cover = post.media_files?.find((m) => m.type === 'cover')

              return (
                <div key={post.id} className="flex gap-2 px-3 py-3">
                  <BigSurAvatar size={28} />
                  <div className="min-w-0 flex-1">
                    {/* Name row */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[11.5px] font-bold text-neutral-900 truncate">BigSur Energy</span>
                      <svg className="h-3 w-3 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1-2.52-1.26-3.91-.8-.66-1.31-2-2.2-3.34-2.2-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1 1.01-1.26 2.52-.8 3.91-1.31.66-2.2 2-2.2 3.34 0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1 2.52 1.26 3.91.8.66 1.31 2 2.2 3.34 2.2 1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1-1.01 1.26-2.52.8-3.91 1.31-.67 2.2-2 2.2-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                      </svg>
                      <span className="text-[10.5px] text-neutral-400 truncate">@bigsur_energy</span>
                    </div>

                    {/* Copy */}
                    <p className="mt-0.5 line-clamp-4 text-[11.5px] leading-relaxed text-neutral-900 whitespace-pre-wrap">
                      {copy || <span className="italic text-neutral-400">No copy</span>}
                    </p>

                    {/* Media — static only, no video elements */}
                    {(cover || (media && media.type !== 'video')) && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-[#E5E5E5]">
                        <img
                          src={(cover ?? media)!.url}
                          alt={post.title}
                          className="max-h-40 w-full object-cover"
                        />
                      </div>
                    )}
                    {media && media.type === 'video' && !cover && (
                      <div className="mt-2 h-24 w-full rounded-xl bg-neutral-200" />
                    )}

                    {/* Actions */}
                    <div className="mt-2 flex items-center justify-between text-neutral-400">
                      {[MessageCircle, Repeat2, Heart, BarChart2].map((Icon, i) => (
                        <button key={i} className="hover:text-blue-500 transition-colors">
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
