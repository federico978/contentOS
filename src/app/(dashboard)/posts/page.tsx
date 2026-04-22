'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Upload, ImageIcon, FileDown } from 'lucide-react'
import { isSameDay } from 'date-fns'
import { toArDate } from '@/lib/dates'
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  pointerWithin, useSensor, useSensors,
} from '@dnd-kit/core'
import { SmartPointerSensor } from '@/lib/dnd-sensors'
import { PostCard } from '@/components/posts/PostCard'
import { PostFilters } from '@/components/posts/PostFilters'
import { MiniCalendar } from '@/components/calendar/MiniCalendar'
import { SidebarInstagramFeed } from '@/components/posts/SidebarInstagramFeed'
import { SidebarLinkedInFeed } from '@/components/posts/SidebarLinkedInFeed'
import { SidebarXFeed } from '@/components/posts/SidebarXFeed'
import { BulkUpload } from '@/components/posts/BulkUpload'
import { PostCardSkeleton } from '@/components/posts/PostCardSkeleton'
import { ExportPDFModal } from '@/components/posts/ExportPDFModal'
import { usePostStore } from '@/store/usePostStore'
import { fetchPosts, fetchChannels, updatePostScheduledAt, upsertChannelScheduledAt } from '@/lib/api/posts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function PostsPage() {
  const {
    posts: allPosts, setPosts, setChannels: storeSetChannels, setLoading, loading,
    filteredPosts, patchPost, filters, channels: allChannels,
  } = usePostStore()

  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [showBulk,      setShowBulk]      = useState(false)
  const [showExportPDF, setShowExportPDF] = useState(false)
  const [activePostId,  setActivePostId]  = useState<string | null>(null)
  const [droppedDate,   setDroppedDate]   = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 6 } }),
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [posts, channels] = await Promise.all([fetchPosts(), fetchChannels()])
        setPosts(posts)
        storeSetChannels(channels)
      } catch (err) {
        console.error('Failed to load posts:', err instanceof Error ? err.message : err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setPosts, storeSetChannels, setLoading])

  // Apply store filters then optional calendar date filter
  let posts = filteredPosts()
  if (selectedDate) {
    const day = new Date(selectedDate)
    posts = posts.filter((p) => {
      if (p.scheduled_at && isSameDay(toArDate(p.scheduled_at), day)) return true
      return p.post_channels.some((pc) => pc.scheduled_at && isSameDay(toArDate(pc.scheduled_at), day))
    })
  }

  const activePost = activePostId ? allPosts.find((p) => p.id === activePostId) ?? null : null

  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[filters.columns] ?? 'grid-cols-2'

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    setActivePostId((active.data.current as { postId?: string } | undefined)?.postId ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActivePostId(null)
    if (!over) return

    const postId  = (active.data.current as { postId?: string } | undefined)?.postId
    const isoDate = String(over.id)

    if (!postId || isNaN(new Date(isoDate).getTime())) return

    const post = allPosts.find((p) => p.id === postId)
    if (!post) return

    setDroppedDate(isoDate)
    setTimeout(() => setDroppedDate(null), 1400)

    if (filters.channel) {
      const targetChannel = allChannels.find((c) => c.slug === filters.channel)
      if (!targetChannel) return

      const existingPc = post.post_channels.find((c) => c.channel_id === targetChannel.id)

      patchPost(postId, {
        post_channels: existingPc
          ? post.post_channels.map((c) =>
              c.channel_id === targetChannel.id ? { ...c, scheduled_at: isoDate } : c
            )
          : [
              ...post.post_channels,
              {
                id: `tmp-${targetChannel.id}`,
                post_id: postId,
                channel_id: targetChannel.id,
                copy_override: null,
                status: post.status,
                scheduled_at: isoDate,
                channel: targetChannel,
              },
            ],
      })
      try {
        await upsertChannelScheduledAt(postId, targetChannel.id, isoDate, post.status)
        toast.success('Fecha actualizada')
      } catch (err) {
        console.error('[drag→calendar] upsertChannelScheduledAt failed:', err)
        patchPost(postId, { post_channels: post.post_channels })
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Error al actualizar la fecha: ${msg}`)
      }
    } else {
      patchPost(postId, { scheduled_at: isoDate, status: 'scheduled' })
      try {
        await updatePostScheduledAt(postId, isoDate)
        toast.success('Fecha actualizada')
      } catch {
        patchPost(postId, { scheduled_at: post.scheduled_at, status: post.status })
        toast.error('Error al actualizar la fecha')
      }
    }
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-black text-[#0A0A0A]">Posts</h1>
            {!loading && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                {posts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportPDF(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[#333333] transition-all duration-150 hover:-translate-y-px active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,0,0,0.12)',
              }}
            >
              <FileDown className="h-3.5 w-3.5" strokeWidth={2} />
              Exportar PDF
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[#333333] transition-all duration-150 hover:-translate-y-px active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,0,0,0.12)',
              }}
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
              Carga masiva
            </button>
            <Link href="/posts/new">
              <div className="flex items-center gap-1.5 rounded-full bg-[#111111] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-neutral-800 hover:-translate-y-px active:scale-[0.99]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                New Post
              </div>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div
          className="px-6 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <PostFilters />
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — posts grid */}
          <div className="flex-[7] overflow-y-auto px-6 py-4">
            {loading ? (
              <div className={cn('grid gap-3', colClass)}>
                {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-neutral-50">
                  <Plus className="h-4 w-4 text-neutral-400" />
                </div>
                <div>
                  <p className="text-[13.5px] font-medium text-neutral-700">
                    {selectedDate ? 'No hay posts para este día' : 'No posts yet'}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-neutral-400">
                    {selectedDate
                      ? 'Hacé click en otro día o en "Mostrar todos los posts"'
                      : 'Create your first post to get started'}
                  </p>
                </div>
                {!selectedDate && (
                  <Link href="/posts/new">
                    <div className="rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
                      Create post
                    </div>
                  </Link>
                )}
              </div>
            ) : (
              <div className={cn('grid gap-3', colClass)}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onHover={setHoveredPostId}
                    onLeave={() => setHoveredPostId(null)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right — calendar + Instagram feed */}
          <div className="flex-[3] shrink-0 overflow-y-auto border-l border-[#D9D9D9] px-5 py-5 flex flex-col gap-6">
            <MiniCalendar
              posts={allPosts}
              hoveredPostId={hoveredPostId}
              selectedDate={selectedDate}
              onDayClick={setSelectedDate}
              droppedDate={droppedDate}
              activeChannel={filters.channel ?? 'all'}
            />
            <div className="relative">
              <div
                key={filters.channel ?? 'ig'}
                className="transition-opacity duration-200 animate-in fade-in"
              >
                {filters.channel === 'linkedin' ? (
                  <SidebarLinkedInFeed posts={allPosts} />
                ) : filters.channel === 'x' ? (
                  <SidebarXFeed posts={allPosts} />
                ) : (
                  <SidebarInstagramFeed posts={allPosts} />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {activePost && (
          <div className="flex w-52 cursor-grabbing items-center gap-2.5 rounded-xl border border-neutral-300 bg-white p-2.5 shadow-2xl opacity-95 ring-1 ring-neutral-200">
            {activePost.media_files?.[0] ? (
              <img
                src={activePost.media_files[0].url}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
                alt=""
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <ImageIcon className="h-4 w-4 text-neutral-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-neutral-800">
                {activePost.title || 'Untitled'}
              </p>
              <p className="text-[10px] text-neutral-400">
                Soltar en el calendario →
              </p>
            </div>
          </div>
        )}
      </DragOverlay>

    </DndContext>

    {showBulk      && <BulkUpload      onClose={() => setShowBulk(false)} />}
    {showExportPDF && <ExportPDFModal  posts={allPosts} onClose={() => setShowExportPDF(false)} />}
    </>
  )
}
