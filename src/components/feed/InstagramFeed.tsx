'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Grid3X3, Heart, MessageCircle, Send, Bookmark, ImageIcon, Play } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { cn } from '@/lib/utils'
import { VideoThumbnail } from './VideoThumbnail'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
import { getVideoProvider } from '@/lib/external-video'

const VIDEO_EXT = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i
const isVideo = (m: { type: string; url: string }) =>
  m.type === 'video' || VIDEO_EXT.test(m.url)

interface Props {
  posts: PostWithDetails[]
  onReorder: (items: PostWithDetails[], movedId: string, newIndex: number) => void
  onPostClick: (id: string) => void
}

// ── Sortable grid cell ────────────────────────────────────────────────────────
function SortableCell({
  post,
  onPostClick,
  dragJustEnded,
  onHover,
  onLeave,
}: {
  post: PostWithDetails
  onPostClick: (id: string) => void
  dragJustEnded: React.MutableRefObject<boolean>
  onHover: (post: PostWithDetails) => void
  onLeave: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id })

  const media       = post.media_files?.find((m) => m.type !== 'cover')
  const coverMedia  = post.media_files?.find((m) => m.type === 'cover')

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (dragJustEnded.current) return
        onPostClick(post.id)
      }}
      onMouseEnter={() => onHover(post)}
      onMouseLeave={onLeave}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden bg-neutral-100',
        isDragging && 'opacity-30'
      )}
    >
      {media ? (
        isVideo(media) ? (
          <>
            <VideoThumbnail src={media.url} />
            <div className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/40 p-1">
              <Play className="h-3 w-3 fill-white text-white" />
            </div>
          </>
        ) : (
          <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
        )
      ) : coverMedia ? (
        <>
          <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
          <div className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/40 p-1">
            <Play className="h-3 w-3 fill-white text-white" />
          </div>
        </>
      ) : (
        // No media, no cover — plain neutral square (with icon only if no external URL)
        !post.external_media_url && (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-neutral-300" />
          </div>
        )
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-2 text-[11px] font-medium leading-tight text-white">
          {post.title || 'Untitled'}
        </p>
      </div>
    </div>
  )
}

// ── Drag overlay cell ─────────────────────────────────────────────────────────
function OverlayCell({ post }: { post: PostWithDetails }) {
  const media      = post.media_files?.find((m) => m.type !== 'cover')
  const coverMedia = post.media_files?.find((m) => m.type === 'cover')
  return (
    <div className="relative aspect-square w-full cursor-grabbing overflow-hidden rounded shadow-2xl ring-2 ring-neutral-900 bg-neutral-100">
      {media ? (
        isVideo(media) ? (
          <>
            <VideoThumbnail src={media.url} />
            <div className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/40 p-1">
              <Play className="h-3 w-3 fill-white text-white" />
            </div>
          </>
        ) : (
          <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
        )
      ) : coverMedia ? (
        <>
          <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
          <div className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/40 p-1">
            <Play className="h-3 w-3 fill-white text-white" />
          </div>
        </>
      ) : !post.external_media_url && (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-5 w-5 text-neutral-300" />
        </div>
      )}
    </div>
  )
}

// ── iPhone frame ──────────────────────────────────────────────────────────────
function IPhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 390 }}>
      {/* Side buttons — volume up/down (left) */}
      <div className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l-full bg-[#3A3A3A]" />
      <div className="absolute -left-[3px] top-[164px] h-8 w-[3px] rounded-l-full bg-[#3A3A3A]" />
      <div className="absolute -left-[3px] top-[72px] h-6 w-[3px] rounded-l-full bg-[#3A3A3A]" />
      {/* Power button (right) */}
      <div className="absolute -right-[3px] top-[140px] h-14 w-[3px] rounded-r-full bg-[#3A3A3A]" />

      {/* Phone body */}
      <div
        className="relative overflow-hidden bg-white"
        style={{
          borderRadius: 52,
          border: '10px solid #1C1C1E',
          boxShadow:
            '0 0 0 1px #3A3A3A, inset 0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)',
          height: 780,
        }}
      >
        {/* Status bar */}
        <div className="relative flex h-[52px] shrink-0 items-start justify-between bg-white px-7 pt-3">
          {/* Time */}
          <span className="text-[14px] font-semibold text-neutral-900">9:41</span>

          {/* Dynamic island */}
          <div
            className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[#1C1C1E]"
            style={{ width: 120, height: 34 }}
          />

          {/* Status icons */}
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

        {/* Scrollable Instagram content */}
        <div className="h-[calc(780px-52px-20px)] overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex h-5 shrink-0 items-center justify-center bg-white">
          <div className="h-[5px] w-[134px] rounded-full bg-neutral-900" />
        </div>
      </div>
    </div>
  )
}

// ── Full post detail card (shown on hover to the right of the phone) ──────────
function PostDetailCard({ post, visible }: { post: PostWithDetails; visible: boolean }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const media      = post.media_files?.find((m) => m.type !== 'cover')
  const coverMedia = post.media_files?.find((m) => m.type === 'cover')
  const likes    = Math.floor(Math.random() * 1800 + 200)
  const comments = Math.floor(Math.random() * 60 + 4)

  // Play/pause hosted video in sync with panel visibility.
  // Also re-runs when media.url changes (hovering a different post while panel stays open).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (visible) {
      // play() may reject if video hasn't buffered yet — onCanPlay handles that case
      v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [visible, media?.url])

  // Fallback: if play() raced against load, retry as soon as the browser says it's ready
  function handleCanPlay() {
    if (visible) videoRef.current?.play().catch(() => {})
  }

  function iframeUrl(url: string) {
    const provider = getVideoProvider(url)
    if (provider === 'gdrive')   return `${url}&rm=minimal&autoplay=1`
    if (provider === 'youtube')  return `${url}&autoplay=1&mute=1`
    if (provider === 'vimeo')    return `${url}?autoplay=1&muted=1`
    return url
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DBDBDB] bg-white shadow-xl">
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <BigSurAvatar size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-neutral-900 leading-tight">bigsur.energy</p>
          {post.scheduled_at && (
            <p className="text-[10px] text-neutral-400">
              {new Date(post.scheduled_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })}
            </p>
          )}
        </div>
        <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>

      {/* Media */}
      <div className="aspect-square w-full overflow-hidden bg-neutral-100">
        {media ? (
          isVideo(media) ? (
            // Hosted video: always rendered, play/pause controlled via ref + onCanPlay fallback
            <video
              ref={videoRef}
              src={media.url}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onCanPlay={handleCanPlay}
            />
          ) : (
            <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
          )
        ) : coverMedia ? (
          // External video with cover — iframe when visible, cover image when not
          visible && post.external_media_url ? (
            <iframe
              src={iframeUrl(post.external_media_url)}
              className="h-full w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
          )
        ) : post.external_media_url ? (
          // External video, no cover — iframe when visible, gray when not
          visible ? (
            <iframe
              src={iframeUrl(post.external_media_url)}
              className="h-full w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="h-full w-full bg-neutral-200" />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
            <ImageIcon className="h-8 w-8 text-neutral-200" />
            <p className="text-[11px] text-neutral-300">Sin imagen</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center px-3 pt-3 pb-1">
        <div className="flex items-center gap-3.5">
          <Heart className="h-[22px] w-[22px] text-neutral-800" strokeWidth={1.5} />
          <MessageCircle className="h-[22px] w-[22px] text-neutral-800" strokeWidth={1.5} />
          <Send className="h-[22px] w-[22px] text-neutral-800" strokeWidth={1.5} />
        </div>
        <Bookmark className="ml-auto h-[22px] w-[22px] text-neutral-800" strokeWidth={1.5} />
      </div>

      {/* Likes */}
      <div className="px-3 pt-1 pb-1">
        <p className="text-[12px] font-semibold text-neutral-900">{likes.toLocaleString('es-AR')} likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        {post.copy ? (
          <p className="text-[12px] leading-relaxed text-neutral-900">
            <span className="font-semibold">bigsur.energy </span>
            {post.copy}
          </p>
        ) : (
          <p className="text-[12px] italic text-neutral-300">Sin copy</p>
        )}
        <p className="mt-1.5 text-[11px] text-neutral-400">
          Ver los {comments} comentarios
        </p>
        <p className="mt-1 text-[10.5px] uppercase tracking-wide text-neutral-300">hace 2 horas</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function InstagramFeed({ posts, onReorder, onPostClick }: Props) {
  const [items, setItems] = useState(posts)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredPost, setHoveredPost] = useState<PostWithDetails | null>(null)
  const dragJustEnded = useRef(false)
  // Keep the last hovered post in a ref so the card content stays mounted during the fade-out transition
  const lastHoveredRef = useRef<PostWithDetails | null>(null)
  if (hoveredPost) lastHoveredRef.current = hoveredPost

  // Sync when parent posts change (e.g. after API update)
  const postsKey = posts.map((p) => p.id + (p.scheduled_at ?? '')).join('|')
  const prevKey = useRef(postsKey)
  if (prevKey.current !== postsKey) {
    prevKey.current = postsKey
    setItems(posts)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    dragJustEnded.current = true
    setTimeout(() => { dragJustEnded.current = false }, 150)

    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((p) => p.id === active.id)
    const newIndex = items.findIndex((p) => p.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)
    onReorder(newItems, String(active.id), newIndex)
  }

  const activePost = activeId ? items.find((p) => p.id === activeId) : null

  const feedContent = (
    <div className="w-full pb-10">
      {/* ── Profile header ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <BigSurAvatar size={70} />
          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-semibold text-neutral-900">bigsur.energy</span>
            </div>
            <div className="flex gap-4 text-[12px]">
              <span><b>{items.length}</b> posts</span>
              <span><b>4,812</b> followers</span>
              <span><b>183</b> following</span>
            </div>
            <div className="text-[12px] leading-relaxed text-neutral-800">
              <p className="font-semibold">BigSur Energy</p>
              <p className="text-neutral-500">⚡ Turning off-grid gas into high-value digital assets</p>
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
        <div className="flex flex-1 items-center justify-center gap-1.5 border-t-2 border-neutral-900 py-2 text-neutral-900">
          <Grid3X3 className="h-4 w-4" />
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-[1.5px]">
            {items.map((post) => (
              <SortableCell
                key={post.id}
                post={post}
                onPostClick={onPostClick}
                dragJustEnded={dragJustEnded}
                onHover={setHoveredPost}
                onLeave={() => setHoveredPost(null)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activePost && <OverlayCell post={activePost} />}
        </DragOverlay>
      </DndContext>
    </div>
  )

  return (
    /*
      Flex row: [phone] [panel]
      The panel uses position:sticky so it stays in the viewport as the phone scrolls,
      and it's always physically to the RIGHT of the phone — no JS measurement needed.
    */
    <div className="flex items-start justify-center gap-8 py-8">
      {/* Phone */}
      <div className="shrink-0">
        <IPhoneFrame>
          {feedContent}
        </IPhoneFrame>
      </div>

      {/*
        Panel — sticky within the page's scroll container.
        • self-start  : flex item aligns to top, so sticky works correctly
        • top-4       : sticks 16px from the top of the scroll container
        • max-h + overflow-y-auto: internal scroll when content exceeds viewport height
        • opacity + pointer-events toggle visibility without unmounting the card
          (lastHoveredRef keeps content mounted during the fade-out transition)
      */}
      <div
        className="shrink-0 self-start"
        style={{
          position:      'sticky',
          top:           16,
          width:         348,
          maxHeight:     'calc(100vh - 32px)',
          overflowY:     'auto',
          scrollbarWidth: 'thin',
          opacity:       hoveredPost ? 1 : 0,
          pointerEvents: hoveredPost ? 'auto' : 'none',
          transform:     `translateX(${hoveredPost ? 0 : 10}px)`,
          transition:    'opacity 180ms ease, transform 180ms ease',
        }}
      >
        {lastHoveredRef.current && <PostDetailCard post={lastHoveredRef.current} visible={!!hoveredPost} />}
      </div>
    </div>
  )
}
