'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, BarChart2, Bookmark, Share, MoreHorizontal, Play, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PostWithDetails, PostApproval, PostComment } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'
import { ReviewIndicators } from '@/components/social-cards/ReviewIndicators'

const VIDEO_EXT = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i
const isVideo = (m: { type: string; url: string }) =>
  m.type === 'video' || VIDEO_EXT.test(m.url)

function fmtChannelDate(date: string | null): string {
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
  onVote?: (decision: 'approved' | 'rejected') => Promise<void>
  approvals?: PostApproval[]
  comments?: PostComment[]
}

export function XPostCard({ post, onClick, selected, scheduledDate = null, myVote, onVote, approvals, comments }: Props) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [voting,  setVoting]  = useState(false)

  const media = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const pc    = post.post_channels.find((c) => c.channel?.slug === 'x')
  const copy  = pc?.copy_override || post.copy
  const hasMedia = !!(media || cover)

  async function handleVote(decision: 'approved' | 'rejected') {
    if (!onVote || voting) return
    setVoting(true)
    try { await onVote(decision) } finally { setVoting(false) }
  }

  const showBar = onVote && hasMedia && (hovered || !!myVote)

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#EFF3F4] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 overflow-hidden rounded-full">
              <BigSurAvatar size={42} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-bold text-neutral-900">BigSur Energy</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#1D9BF0"/>
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[14px] text-neutral-500">@bigsur_energy</p>
              <p className="text-[11.5px] text-neutral-400">{fmtChannelDate(scheduledDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ReviewIndicators approvals={approvals} comments={comments} />
            <MoreHorizontal className="h-5 w-5 text-neutral-400" />
          </div>
        </div>

        {/* Copy */}
        {copy && (
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-900 whitespace-pre-wrap line-clamp-4">
            {copy}
          </p>
        )}

        {/* Media */}
        {hasMedia && (
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#EFF3F4] bg-neutral-100">

            {/* Approval overlay bar */}
            <div
              className={cn(
                'absolute inset-x-0 top-0 z-10 flex transition-opacity duration-150',
                showBar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                disabled={voting}
                onClick={() => handleVote('approved')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold backdrop-blur-[8px] transition-colors disabled:opacity-60',
                  myVote === 'approved'
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-black/50 text-white/80 hover:bg-emerald-500/80',
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Aprobar
              </button>
              <div className="w-px self-stretch bg-white/20" />
              <button
                disabled={voting}
                onClick={() => handleVote('rejected')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold backdrop-blur-[8px] transition-colors disabled:opacity-60',
                  myVote === 'rejected'
                    ? 'bg-orange-500/90 text-white'
                    : 'bg-black/50 text-white/80 hover:bg-orange-500/80',
                )}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                Solicitar cambios
              </button>
            </div>

            {media && isVideo(media) ? (
              playing ? (
                <video
                  src={media.url}
                  className="aspect-video w-full object-cover"
                  autoPlay muted loop playsInline controls
                />
              ) : (
                <div
                  className="relative aspect-video w-full cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setPlaying(true) }}
                >
                  <VideoThumbnail src={media.url} className="aspect-video w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                    <div className="flex items-center justify-center rounded-full bg-black/50 p-3">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                  </div>
                </div>
              )
            ) : media ? (
              <img src={media.url} alt="" className="max-h-64 w-full object-cover" />
            ) : (
              <img src={cover!.url} alt="" className="max-h-64 w-full object-cover" />
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-3 flex items-center justify-between text-neutral-500">
          {[
            { icon: MessageCircle, count: '8'    },
            { icon: Repeat2,       count: '12'   },
            { icon: Heart,         count: '94'   },
            { icon: BarChart2,     count: '4.2K' },
            { icon: Bookmark,      count: null   },
          ].map(({ icon: Icon, count }, i) => (
            <div key={i} className="flex items-center gap-1">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.5} />
              {count && <span className="text-[13px]">{count}</span>}
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
