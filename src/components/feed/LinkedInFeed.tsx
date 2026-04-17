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
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal, Play } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
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

function LinkedInCard({
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
  const pc    = post.post_channels.find((c) => c.channel?.slug === 'linkedin')
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
        'cursor-pointer rounded-xl border border-[#E5E5E5] bg-white shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-30'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex items-start gap-2.5">
          <BigSurAvatar size={40} />
          <div>
            <p className="text-[13.5px] font-semibold text-neutral-900 leading-tight">BigSur Energy</p>
            <p className="text-[11.5px] text-neutral-500 leading-tight">Turning off-grid gas into high-value digital assets · 1st</p>
            <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-neutral-400">
              <span>Just now</span><span>·</span><Globe className="h-3 w-3" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-neutral-400" />
      </div>

      {/* Copy */}
      <div className="px-4 pb-3">
        <p className="line-clamp-3 text-[13px] leading-relaxed text-neutral-800">
          {copy || <span className="text-neutral-400 italic">No copy</span>}
        </p>
      </div>

      {/* Media */}
      {(media || cover) && (
        <div className="w-full overflow-hidden bg-neutral-100">
          {media && isVideo(media) ? (
            playing ? (
              <video src={media.url} className="aspect-video w-full object-cover" autoPlay muted loop playsInline controls />
            ) : (
              <div className="relative aspect-video w-full cursor-pointer" onClick={() => setPlaying(true)}>
                <VideoThumbnail src={media.url} className="aspect-video w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                  <div className="flex items-center justify-center rounded-full bg-black/50 p-3">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </div>
                </div>
              </div>
            )
          ) : media ? (
            <img src={media.url} alt={post.title} className="aspect-video w-full object-cover" />
          ) : cover ? (
            <img src={cover.url} alt={post.title} className="aspect-video w-full object-cover" />
          ) : null}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[11.5px] text-neutral-500">
        <div className="flex items-center gap-1">
          <span>❤️👍🎉</span><span>1,234</span>
        </div>
        <span>56 comments</span>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-[#E5E5E5] px-1 py-1">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageSquare, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[11.5px] font-medium text-neutral-500 hover:bg-neutral-50 rounded-md transition-colors">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />{label}
          </button>
        ))}
      </div>
    </div>
  )
}

function OverlayCard({ post }: { post: PostWithDetails }) {
  const pc   = post.post_channels.find((c) => c.channel?.slug === 'linkedin')
  const copy = pc?.copy_override || post.copy
  return (
    <div className="cursor-grabbing rounded-xl border border-neutral-300 bg-white shadow-2xl ring-2 ring-neutral-400 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <BigSurAvatar size={36} />
        <div>
          <p className="text-[13px] font-semibold text-neutral-900">{post.title || 'Untitled'}</p>
          <p className="line-clamp-1 text-[12px] text-neutral-500">{copy}</p>
        </div>
      </div>
    </div>
  )
}

export function LinkedInFeed({ posts, onReorder, onPostClick }: Props) {
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
    <div className="mx-auto w-full max-w-[560px] space-y-1 pb-10 pt-2">
      {/* Profile mini-header */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm">
        <BigSurAvatar size={48} />
        <div>
          <p className="text-[14px] font-semibold text-neutral-900">BigSur Energy</p>
          <p className="text-[12px] text-neutral-500">Turning off-grid gas into high-value digital assets</p>
          <p className="text-[11.5px] text-neutral-400">1,248 followers · 312 connections</p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((post) => (
              <LinkedInCard key={post.id} post={post} onPostClick={onPostClick} dragJustEnded={dragJustEnded} />
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
