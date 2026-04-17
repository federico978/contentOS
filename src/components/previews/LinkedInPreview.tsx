'use client'

import { useState } from 'react'
import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal, Globe } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'

interface Props {
  post: PostWithDetails
  copyOverride?: string | null
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i

function isVideo(media: { type: string; url: string }) {
  return media.type === 'video' || VIDEO_EXTENSIONS.test(media.url)
}

export function LinkedInPreview({ post, copyOverride }: Props) {
  const media = post.media_files?.[0]
  const copy = copyOverride ?? post.copy
  const [expanded, setExpanded] = useState(false)
  const isLong = copy.length > 200

  return (
    <div className="mx-auto w-[420px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            Y
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Your Name</p>
            <p className="text-xs text-zinc-500 leading-tight">Your Title · 1st</p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400">
              <span>Just now</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            + Follow
          </button>
          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
        </div>
      </div>

      {/* Copy */}
      <div className="px-4 pt-3">
        <p className="text-sm text-zinc-900 leading-relaxed">
          {isLong && !expanded ? `${copy.slice(0, 200)}...` : copy || (
            <span className="text-zinc-400">No copy yet...</span>
          )}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
          >
            {expanded ? 'see less' : 'see more'}
          </button>
        )}
      </div>

      {/* Media */}
      {media && (
        <div className="mt-3 w-full bg-zinc-100">
          {isVideo(media) ? (
            <video
              src={media.url}
              className="aspect-video w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img src={media.url} alt={post.title} className="aspect-video w-full object-cover" />
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="flex -space-x-0.5">
            {['❤️','👍','🎉'].map((e, i) => (
              <span key={i} className="text-[13px]">{e}</span>
            ))}
          </span>
          <span>1,234</span>
        </div>
        <span>56 comments</span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-zinc-100" />

      {/* Action buttons */}
      <div className="flex items-center px-2 py-1">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageSquare, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

