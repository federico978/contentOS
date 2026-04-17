'use client'

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

interface Props {
  post: PostWithDetails
  copyOverride?: string | null
  className?: string
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i

function isVideo(media: { type: string; url: string }) {
  return media.type === 'video' || VIDEO_EXTENSIONS.test(media.url)
}

export function InstagramPreview({ post, copyOverride, className }: Props) {
  const media = post.media_files?.[0]
  const copy = copyOverride ?? post.copy

  return (
    <div className={className ?? 'mx-auto w-[375px]'} style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2.5">
          <BigSurAvatar size={32} />
          <div>
            <p className="text-xs font-semibold leading-tight text-zinc-900">bigsur.energy</p>
            <p className="text-[10px] text-zinc-400">Sponsored</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
      </div>

      {/* Media */}
      <div className="aspect-square w-full bg-zinc-100">
        {media ? (
          isVideo(media) ? (
            <video
              src={media.url}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-xs text-zinc-300">No media</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 text-zinc-800" strokeWidth={1.5} />
            <MessageCircle className="h-6 w-6 text-zinc-800" strokeWidth={1.5} />
            <Send className="h-6 w-6 text-zinc-800" strokeWidth={1.5} />
          </div>
          <Bookmark className="h-6 w-6 text-zinc-800" strokeWidth={1.5} />
        </div>
        <p className="mt-2 text-xs font-semibold text-zinc-900">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-4 pt-1">
        <p className="text-xs text-zinc-900">
          <span className="font-semibold">bigsur.energy</span>{' '}
          <span className="line-clamp-3 leading-relaxed">{copy || <span className="text-zinc-400">No caption yet...</span>}</span>
        </p>
        {copy && copy.length > 100 && (
          <p className="mt-0.5 text-xs text-zinc-400">more</p>
        )}
        <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">2 hours ago</p>
      </div>
    </div>
  )
}
