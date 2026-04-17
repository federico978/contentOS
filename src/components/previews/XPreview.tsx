'use client'

import { Heart, MessageCircle, Repeat2, BarChart2, Bookmark, Share, MoreHorizontal } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'

interface Props {
  post: PostWithDetails
  copyOverride?: string | null
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i

function isVideo(media: { type: string; url: string }) {
  return media.type === 'video' || VIDEO_EXTENSIONS.test(media.url)
}

export function XPreview({ post, copyOverride }: Props) {
  const media = post.media_files?.[0]
  const copy = copyOverride ?? post.copy

  return (
    <div className="mx-auto w-[400px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm font-sans">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
            Y
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="truncate text-sm font-bold text-zinc-900">Your Name</span>
                <svg className="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1-2.52-1.26-3.91-.8-.66-1.31-2-2.2-3.34-2.2-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1 1.01-1.26 2.52-.8 3.91-1.31.66-2.2 2-2.2 3.34 0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1 2.52 1.26 3.91.8.66 1.31 2 2.2 3.34 2.2 1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1-1.01 1.26-2.52.8-3.91 1.31-.67 2.2-2 2.2-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                </svg>
              </div>
              <MoreHorizontal className="h-4 w-4 shrink-0 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500">@your_handle · just now</p>

            {/* Tweet text */}
            <p className="mt-2 text-sm leading-relaxed text-zinc-900 whitespace-pre-wrap">
              {copy || <span className="text-zinc-400">No copy yet...</span>}
            </p>

            {/* Media */}
            {media && (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
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
                  <img
                    src={media.url}
                    alt={post.title}
                    className="max-h-72 w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between pb-3">
              {[
                { icon: MessageCircle, count: '24' },
                { icon: Repeat2, count: '8' },
                { icon: Heart, count: '142' },
                { icon: BarChart2, count: '2.1K' },
              ].map(({ icon: Icon, count }, i) => (
                <button
                  key={i}
                  className="group flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-blue-500"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-xs">{count}</span>
                </button>
              ))}
              <div className="flex items-center gap-3 text-zinc-400">
                <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                <Share className="h-4 w-4" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
