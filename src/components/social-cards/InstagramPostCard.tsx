'use client'

import { Heart, MessageCircle, Bookmark, MoreHorizontal, Play, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'

const VIDEO_EXT = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i
const isVideo = (m: { type: string; url: string }) =>
  m.type === 'video' || VIDEO_EXT.test(m.url)

export function fmtChannelDate(date: string | null): string {
  if (!date) return 'Sin fecha programada'
  const d = new Date(date)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(format(d, 'EEEE', { locale: es }))} ${format(d, 'd')} de ${cap(format(d, 'MMMM', { locale: es }))}`
}

interface Props {
  post: PostWithDetails
  onClick: () => void
  selected?: boolean
  scheduledDate?: string | null
  myVote?: 'approved' | 'rejected' | null
}

export function InstagramPostCard({ post, onClick, selected, scheduledDate = null, myVote }: Props) {
  const media = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const pc    = post.post_channels.find((c) => c.channel?.slug === 'instagram')
  const copy  = pc?.copy_override || post.copy
  const hasMedia = !!(media || cover)

  return (
    <article
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#DBDBDB] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1.5px]">
            <div className="rounded-full bg-white p-[1.5px]">
              <BigSurAvatar size={26} />
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold leading-none text-neutral-900">bigsur.energy</p>
            <p className="mt-0.5 text-[10px] text-neutral-400">{fmtChannelDate(scheduledDate)}</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-neutral-800" />
      </div>

      {/* Media — 4:5 */}
      {hasMedia && (
        <div className="relative w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: '4/5' }}>
          {myVote && (
            <div className={cn(
              'absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md',
              myVote === 'approved' ? 'bg-emerald-500' : 'bg-red-500',
            )}>
              {myVote === 'approved'
                ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                : <X     className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              }
            </div>
          )}
          {media ? (
            isVideo(media) ? (
              <div className="relative h-full w-full">
                {cover
                  ? <img src={cover.url} alt="" className="h-full w-full object-cover" />
                  : <VideoThumbnail src={media.url} className="h-full w-full object-cover" />
                }
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                    <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <img src={media.url} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <img src={cover!.url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-3.5">
          <Heart className="h-[22px] w-[22px] text-neutral-900" strokeWidth={1.5} />
          <MessageCircle className="h-[22px] w-[22px] text-neutral-900" strokeWidth={1.5} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-900">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <Bookmark className="h-[22px] w-[22px] text-neutral-900" strokeWidth={1.5} />
      </div>

      {/* Likes */}
      <div className="px-2.5 pb-1">
        <p className="text-[12px] font-semibold text-neutral-900">1.161 Me gusta</p>
      </div>

      {/* Caption */}
      {copy && (
        <div className="px-2.5 pb-2.5">
          <p className="text-[12px] leading-snug text-neutral-900 whitespace-pre-wrap">
            <span className="font-semibold">bigsur.energy</span>{' '}{copy}
          </p>
        </div>
      )}
    </article>
  )
}
