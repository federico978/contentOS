'use client'

import { Grid3X3, ImageIcon, Play, VideoIcon } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

// Phone dimensions (original, before scaling)
const PHONE_W = 390
const PHONE_H = 780
// Displayed width — sized to fit the ~256px inner column
const DISPLAY_W = 230
const SCALE = DISPLAY_W / PHONE_W         // ≈ 0.590
const DISPLAY_H = Math.round(PHONE_H * SCALE) // ≈ 460

interface Props {
  posts: PostWithDetails[]
  onHover?: (post: PostWithDetails | null) => void
}

export function SidebarInstagramFeed({ posts, onHover }: Props) {
  const igPosts = posts
    .filter((p) => p.scheduled_at && p.post_channels.some((pc) => pc.channel?.slug === 'instagram'))
    .sort((a, b) => {
      // Most recent scheduled_at first; unscheduled posts go to the end
      if (!a.scheduled_at && !b.scheduled_at) return 0
      if (!a.scheduled_at) return 1
      if (!b.scheduled_at) return -1
      return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    })

  const feedContent = (
    <div className="w-full pb-10">
      {/* Profile header */}
      <div className="px-4 pb-4 pt-4">
        <div className="flex items-start gap-5">
          <BigSurAvatar size={70} />
          <div className="flex-1 space-y-2">
            <span className="text-[14px] font-semibold text-neutral-900">bigsur.energy</span>
            <div className="flex gap-4 text-[12px]">
              <span><b>{igPosts.length}</b> posts</span>
              <span><b>4,812</b> followers</span>
              <span><b>183</b> following</span>
            </div>
            <div className="text-[12px] leading-relaxed text-neutral-800">
              <p className="font-semibold">BigSur Energy</p>
              <p className="text-neutral-500">⚡ Off-grid gas → digital assets</p>
              <p className="text-[11px] text-neutral-400">Texas · Louisiana</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-lg bg-[#0095F6] py-1.5 text-[12px] font-semibold text-white">
            Follow
          </button>
          <button className="flex-1 rounded-lg border border-[#DBDBDB] bg-[#EFEFEF] py-1.5 text-[12px] font-semibold text-neutral-800">
            Message
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-t border-[#DBDBDB]">
        <div className="flex flex-1 items-center justify-center gap-1.5 border-t-2 border-neutral-900 py-2">
          <Grid3X3 className="h-4 w-4 text-neutral-900" />
        </div>
      </div>

      {/* Photo grid */}
      {igPosts.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
          <ImageIcon className="h-8 w-8 text-neutral-200" />
          <p className="text-[12px] text-neutral-300">
            No hay posts con Instagram asignado
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[1.5px]">
          {igPosts.map((post) => {
            const media      = post.media_files?.find((m) => m.type !== 'cover')
            const coverMedia = post.media_files?.find((m) => m.type === 'cover')
            return (
              <div
                key={post.id}
                className="relative aspect-square overflow-hidden bg-neutral-100 cursor-pointer"
                onMouseEnter={() => onHover?.(post)}
                onMouseLeave={() => onHover?.(null)}
              >
                {media ? (
                  media.type === 'video' ? (
                    // No video element — show cover if available, else neutral placeholder
                    coverMedia ? (
                      <>
                        <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
                        <div className="absolute right-1 top-1 flex items-center justify-center rounded-full bg-black/40 p-0.5">
                          <Play className="h-2.5 w-2.5 fill-white text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-200">
                        <VideoIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                    )
                  ) : (
                    <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
                  )
                ) : coverMedia ? (
                  <>
                    <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
                    <div className="absolute right-1 top-1 flex items-center justify-center rounded-full bg-black/40 p-0.5">
                      <Play className="h-2.5 w-2.5 fill-white text-white" />
                    </div>
                  </>
                ) : !post.external_media_url && (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-neutral-300" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Section label */}
      <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
        Feed de Instagram
      </p>

      {/*
        Scaling wrapper:
        - outer div clips to the desired display dimensions
        - inner div is the original 390×780 phone, scaled down via transform
      */}
      <div
        style={{ width: DISPLAY_W, height: DISPLAY_H, overflow: 'hidden', position: 'relative', margin: '0 auto' }}
      >
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* ── iPhone frame ─────────────────────────────────── */}
          <div className="relative" style={{ width: PHONE_W }}>
            {/* Side buttons — volume */}
            <div className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l-full bg-[#3A3A3A]" />
            <div className="absolute -left-[3px] top-[164px] h-8 w-[3px] rounded-l-full bg-[#3A3A3A]" />
            <div className="absolute -left-[3px] top-[72px] h-6 w-[3px] rounded-l-full bg-[#3A3A3A]" />
            {/* Power button */}
            <div className="absolute -right-[3px] top-[140px] h-14 w-[3px] rounded-r-full bg-[#3A3A3A]" />

            {/* Phone body */}
            <div
              className="relative overflow-hidden bg-white"
              style={{
                borderRadius: 52,
                border: '10px solid #1C1C1E',
                boxShadow:
                  '0 0 0 1px #3A3A3A, inset 0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)',
                height: PHONE_H,
              }}
            >
              {/* Status bar */}
              <div className="relative flex h-[52px] shrink-0 items-start justify-between bg-white px-7 pt-3">
                <span className="text-[14px] font-semibold text-neutral-900">9:41</span>
                <div
                  className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[#1C1C1E]"
                  style={{ width: 120, height: 34 }}
                />
                <div className="flex items-center gap-1.5 pt-0.5">
                  {/* Signal */}
                  <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                    <rect x="0" y="8" width="3" height="4" rx="0.5" fill="#1C1C1E"/>
                    <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" fill="#1C1C1E"/>
                    <rect x="9" y="3" width="3" height="9" rx="0.5" fill="#1C1C1E"/>
                    <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#1C1C1E"/>
                  </svg>
                  {/* Wifi */}
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <path d="M8 9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="#1C1C1E"/>
                    <path d="M4.5 7C5.8 5.8 6.8 5.2 8 5.2c1.2 0 2.2.6 3.5 1.8" stroke="#1C1C1E" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M1.5 4.5C3.5 2.6 5.6 1.5 8 1.5c2.4 0 4.5 1.1 6.5 3" stroke="#1C1C1E" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {/* Battery */}
                  <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                    <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#1C1C1E" strokeOpacity="0.35"/>
                    <rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="#1C1C1E"/>
                    <path d="M23 4v4a2 2 0 0 0 0-4z" fill="#1C1C1E" fillOpacity="0.4"/>
                  </svg>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="h-[calc(780px-52px-20px)] overflow-y-auto overscroll-contain">
                {feedContent}
              </div>

              {/* Home indicator */}
              <div className="flex h-5 shrink-0 items-center justify-center bg-white">
                <div className="h-[5px] w-[134px] rounded-full bg-neutral-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
