'use client'

import { useRef, useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Heart, MessageCircle, Repeat2, BarChart2, Bookmark, Share, MoreHorizontal, Play } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { VideoThumbnail } from './VideoThumbnail'
import { cn } from '@/lib/utils'

const VIDEO_EXT = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i
const isVideo = (m: { type: string; url: string }) =>
  m.type === 'video' || VIDEO_EXT.test(m.url)

interface Props {
  posts: PostWithDetails[]
  onReorder: (items: PostWithDetails[], movedId: string, newIndex: number) => void
  onPostClick: (id: string) => void
}

function XCard({
  post,
  onPostClick,
  dragJustEnded,
}: {
  post: PostWithDetails
  onPostClick: (id: string) => void
  dragJustEnded: React.MutableRefObject<boolean>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id })

  const [playing, setPlaying] = useState(false)
  const media = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const pc    = post.post_channels.find((c) => c.channel?.slug === 'x')
  const copy  = pc?.copy_override || post.copy

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
      className={cn(
        'cursor-pointer border-b border-[#E5E5E5] bg-white px-4 py-3 transition-colors hover:bg-neutral-50/60',
        isDragging && 'opacity-30'
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">Y</div>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[13.5px] font-bold text-neutral-900 truncate">Your Name</span>
              <svg className="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1-2.52-1.26-3.91-.8-.66-1.31-2-2.2-3.34-2.2-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1 1.01-1.26 2.52-.8 3.91-1.31.66-2.2 2-2.2 3.34 0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1 2.52 1.26 3.91.8.66 1.31 2 2.2 3.34 2.2 1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1-1.01 1.26-2.52.8-3.91 1.31-.67 2.2-2 2.2-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
              <span className="text-[13px] text-neutral-500 truncate">@your_handle · just now</span>
            </div>
            <MoreHorizontal className="h-4 w-4 shrink-0 text-neutral-400" />
          </div>

          {/* Copy */}
          <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-900 whitespace-pre-wrap line-clamp-4">
            {copy || <span className="text-neutral-400 italic">No copy</span>}
          </p>

          {/* Media */}
          {(media || cover) && (
            <div className="mt-2.5 overflow-hidden rounded-2xl border border-[#E5E5E5]">
              {media && isVideo(media) ? (
                playing ? (
                  <video src={media.url} className="aspect-video w-full object-cover" autoPlay muted loop playsInline controls />
                ) : (
                  <div className="relative aspect-video w-full cursor-pointer" onClick={() => setPlaying(true)}>
                    <VideoThumbnail src={media.url} className="aspect-video w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                      <div className="flex items-center justify-center rounded-full bg-black/50 p-3">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </div>
                    </div>
                  </div>
                )
              ) : media ? (
                <img src={media.url} alt={post.title} className="max-h-64 w-full object-cover" />
              ) : cover ? (
                <img src={cover.url} alt={post.title} className="max-h-64 w-full object-cover" />
              ) : null}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2.5 flex items-center justify-between text-neutral-400">
            {[
              { icon: MessageCircle, count: '24' },
              { icon: Repeat2,       count: '8' },
              { icon: Heart,         count: '142' },
              { icon: BarChart2,     count: '2.1K' },
            ].map(({ icon: Icon, count }, i) => (
              <button key={i} className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-[12px]">{count}</span>
              </button>
            ))}
            <div className="flex items-center gap-3">
              <Bookmark className="h-4 w-4 hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              <Share className="h-4 w-4 hover:text-blue-500 transition-colors" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OverlayCard({ post }: { post: PostWithDetails }) {
  const pc   = post.post_channels.find((c) => c.channel?.slug === 'x')
  const copy = pc?.copy_override || post.copy
  return (
    <div className="cursor-grabbing rounded-2xl border border-neutral-300 bg-white px-4 py-3 shadow-2xl ring-2 ring-neutral-400">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">Y</div>
        <div>
          <p className="text-[13px] font-bold text-neutral-900">{post.title || 'Untitled'}</p>
          <p className="line-clamp-1 text-[12px] text-neutral-500">{copy}</p>
        </div>
      </div>
    </div>
  )
}

export function XFeed({ posts, onReorder, onPostClick }: Props) {
  const [items, setItems] = useState(posts)
  const [activeId, setActiveId] = useState<string | null>(null)
  const dragJustEnded = useRef(false)

  const postsKey = posts.map((p) => p.id + (p.scheduled_at ?? '')).join('|')
  const prevKey  = useRef(postsKey)
  if (prevKey.current !== postsKey) { prevKey.current = postsKey; setItems(posts) }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)) }
  function handleDragEnd(e: DragEndEvent) {
    dragJustEnded.current = true
    setTimeout(() => { dragJustEnded.current = false }, 150)
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((p) => p.id === active.id)
    const newIdx = items.findIndex((p) => p.id === over.id)
    const next   = arrayMove(items, oldIdx, newIdx)
    setItems(next)
    onReorder(next, String(active.id), newIdx)
  }

  const activePost = activeId ? items.find((p) => p.id === activeId) : null

  return (
    <div className="mx-auto w-full max-w-[560px] pb-10 pt-2">
      {/* Profile header */}
      <div className="mb-1 px-4 pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[18px] font-bold text-neutral-900">Your Name</p>
            <p className="text-[13.5px] text-neutral-500">@your_handle</p>
            <p className="mt-2 text-[13.5px] text-neutral-800">📲 Content · Strategy · Growth</p>
            <div className="mt-2 flex gap-4 text-[13px] text-neutral-600">
              <span><b className="text-neutral-900">312</b> Following</span>
              <span><b className="text-neutral-900">1,248</b> Followers</span>
            </div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">Y</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-2 flex border-b border-[#E5E5E5]">
        <div className="border-b-2 border-neutral-900 px-4 pb-2.5 pt-1 text-[14px] font-bold text-neutral-900">Posts</div>
        <div className="px-4 pb-2.5 pt-1 text-[14px] font-medium text-neutral-400">Replies</div>
        <div className="px-4 pb-2.5 pt-1 text-[14px] font-medium text-neutral-400">Media</div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
            {items.map((post) => (
              <XCard key={post.id} post={post} onPostClick={onPostClick} dragJustEnded={dragJustEnded} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activePost && <OverlayCard post={activePost} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
