'use client'

import { Globe, ThumbsUp, MessageSquare, Repeat2, Send } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

interface Props {
  posts: PostWithDetails[]
}

export function SidebarLinkedInFeed({ posts }: Props) {
  const liPosts = posts
    .filter((p) =>
      p.post_channels.some((pc) => {
        if (pc.channel?.slug !== 'linkedin') return false
        return !!(pc.scheduled_at || p.scheduled_at)
      })
    )
    .sort((a, b) => {
      const pcA  = a.post_channels.find((pc) => pc.channel?.slug === 'linkedin')
      const pcB  = b.post_channels.find((pc) => pc.channel?.slug === 'linkedin')
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
        Feed de LinkedIn
      </p>

      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
        {/* Profile header */}
        <div className="flex items-center gap-2.5 border-b border-[#E5E5E5] px-3 py-3">
          <BigSurAvatar size={36} />
          <div>
            <p className="text-[12px] font-semibold text-neutral-900 leading-tight">BigSur Energy</p>
            <p className="text-[10.5px] text-neutral-500 leading-tight">Turning off-grid gas into high-value digital assets</p>
          </div>
        </div>

        {liPosts.length === 0 ? (
          <div className="flex h-28 items-center justify-center px-4 text-center">
            <p className="text-[11.5px] text-neutral-400">No hay posts con LinkedIn asignado</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {liPosts.map((post) => {
              const pc    = post.post_channels.find((c) => c.channel?.slug === 'linkedin')
              const copy  = pc?.copy_override || post.copy
              const media = post.media_files?.find((m) => m.type !== 'cover')
              const cover = post.media_files?.find((m) => m.type === 'cover')

              return (
                <div key={post.id} className="px-3 pt-3 pb-2">
                  {/* Post header */}
                  <div className="mb-2 flex items-start gap-2">
                    <BigSurAvatar size={28} />
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-900 leading-tight">BigSur Energy</p>
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <span>Just now</span>
                        <span>·</span>
                        <Globe className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  </div>

                  {/* Copy */}
                  <p className="mb-2 line-clamp-3 text-[11.5px] leading-relaxed text-neutral-800">
                    {copy || <span className="italic text-neutral-400">No copy</span>}
                  </p>

                  {/* Media — static only, no video elements */}
                  {(cover || (media && media.type !== 'video')) && (
                    <div className="mb-2 overflow-hidden rounded-lg bg-neutral-100">
                      <img
                        src={(cover ?? media)!.url}
                        alt={post.title}
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                  )}
                  {media && media.type === 'video' && !cover && (
                    <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-lg bg-neutral-200" />
                  )}

                  {/* Reactions bar */}
                  <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-1.5">
                    {[ThumbsUp, MessageSquare, Repeat2, Send].map((Icon, i) => (
                      <button
                        key={i}
                        className="flex flex-1 items-center justify-center py-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        <Icon className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    ))}
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
