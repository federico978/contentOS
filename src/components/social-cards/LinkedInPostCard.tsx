'use client'

import { useState } from 'react'
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal, Play, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'

const VIDEO_EXT = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i
const isVideo = (m: { type: string; url: string }) =>
  m.type === 'video' || VIDEO_EXT.test(m.url)

// Characters before truncation (~3 lines at LinkedIn card width)
const TRUNCATE_CHARS = 210

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
function parseLinkedInText(text: string): React.ReactNode[] {
  const parts = text.split(URL_RE)
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0A66C2', fontWeight: 600 }}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

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
}

export function LinkedInPostCard({ post, onClick, selected, scheduledDate = null, myVote }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [playing,  setPlaying]  = useState(false)

  const media = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const pc    = post.post_channels.find((c) => c.channel?.slug === 'linkedin')
  const copy  = pc?.copy_override || post.copy || ''

  const isLong     = copy.length > TRUNCATE_CHARS
  const displayCopy = !expanded && isLong ? copy.slice(0, TRUNCATE_CHARS) : copy

  return (
    <article
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#E0E0E0] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="shrink-0 overflow-hidden rounded-full border border-[#E0E0E0]">
          <BigSurAvatar size={48} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-semibold leading-tight text-neutral-900">BigSur Energy</p>
          <p className="text-[12.5px] leading-tight text-neutral-500">Energy Infrastructure</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-400">
            <span>{fmtChannelDate(scheduledDate)}</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-neutral-400" />
      </div>

      {/* Copy — with "... más" expand/collapse */}
      <div
        className="px-4 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        {copy ? (
          <>
            <p className="text-[14px] leading-relaxed text-neutral-900 whitespace-pre-wrap">
              {parseLinkedInText(displayCopy)}
              {isLong && !expanded && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                  className="text-[14px] text-[#666666] hover:underline"
                >
                  {' '}... más
                </button>
              )}
            </p>
            {isLong && expanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
                className="mt-1 text-[14px] text-[#666666] hover:underline"
              >
                menos
              </button>
            )}
          </>
        ) : (
          <p className="text-[14px] italic text-neutral-400">Sin copy</p>
        )}
      </div>

      {/* Media — image: natural height (no crop); video: aspect-video */}
      {(media || cover) && (
        <div className="relative w-full bg-[#f0f0f0] border-t border-[#E0E0E0]">
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
            <img src={media.url} alt="" className="w-full h-auto object-contain block" />
          ) : (
            <img src={cover!.url} alt="" className="w-full h-auto object-contain block" />
          )}
        </div>
      )}

      {/* Social proof */}
      <div className="flex items-center justify-between border-t border-[#E8E8E8] px-4 py-1.5">
        <span className="text-[12px] text-neutral-500">👍 ❤️ 247</span>
        <span className="text-[12px] text-neutral-500">18 comentarios</span>
      </div>

      {/* Action bar */}
      <div className="flex items-center border-t border-[#E8E8E8]">
        {[
          { icon: ThumbsUp,      label: 'Me gusta'  },
          { icon: MessageSquare, label: 'Comentar'  },
          { icon: Repeat2,       label: 'Compartir' },
          { icon: Send,          label: 'Enviar'    },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-neutral-500">
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.5} />
            <span className="text-[12px] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
