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
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'
import { cn } from '@/lib/utils'
import { LinkedInPostCard } from '@/components/social-cards/LinkedInPostCard'

interface Props {
  posts: PostWithDetails[]
  onReorder: (items: PostWithDetails[], movedId: string, newIndex: number) => void
  onPostClick: (id: string) => void
}

function SortableLinkedInCard({
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

  const pc            = post.post_channels.find((c) => c.channel?.slug === 'linkedin')
  const scheduledDate = pc?.scheduled_at ?? post.scheduled_at ?? null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-30')}
    >
      <LinkedInPostCard
        post={post}
        scheduledDate={scheduledDate}
        onClick={() => {
          if (dragJustEnded.current) return
          onPostClick(post.id)
        }}
      />
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
              <SortableLinkedInCard key={post.id} post={post} onPostClick={onPostClick} dragJustEnded={dragJustEnded} />
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
