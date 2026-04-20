'use client'

import { useRef, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, getDay, format,
} from 'date-fns'
import { Plus, ImageIcon, Loader2 } from 'lucide-react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import { PostWithDetails, ChannelSlug } from '@/lib/types'
import { GlassButton } from '@/components/ui/glass-button'
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'
import { cn } from '@/lib/utils'
import { usePostStore } from '@/store/usePostStore'
import { updatePostScheduledAt, upsertChannelScheduledAt } from '@/lib/api/posts'
import { SmartPointerSensor } from '@/lib/dnd-sensors'
import { toast } from 'sonner'

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const GLASS_BF = {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
} as const

// Background color matching --background in globals.css
const BG = 'oklch(0.953 0 0)'

type PostEntry = { post: PostWithDetails; date: string }

export type CalendarHistoryConfig = {
  posts: PostWithDetails[]
  loading: boolean
  hasMore: boolean
  visible: boolean
  onLoad: () => void
  onHide: () => void
  onLoadMore: () => void
}

function displayCopy(post: PostWithDetails, channelSlug: ChannelSlug | 'all'): string | null {
  if (channelSlug !== 'all') {
    const override = post.post_channels.find((pc) => pc.channel?.slug === channelSlug)?.copy_override
    if (override) return override
  }
  return post.copy || null
}

// ── Thumbnail helper ──────────────────────────────────────────────────────────
function PostThumb({ post }: { post: PostWithDetails }) {
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const image = post.media_files?.find((m) => m.type === 'image')
  const video = post.media_files?.find((m) => m.type === 'video')

  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[5px] bg-neutral-100">
      {cover ? (
        <img src={cover.url} alt="" className="h-full w-full object-cover" />
      ) : image ? (
        <img src={image.url} alt="" className="h-full w-full object-cover" />
      ) : video ? (
        <VideoThumbnail
          src={video.url}
          className="h-full w-full object-cover pointer-events-none"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-3.5 w-3.5 text-neutral-300" />
        </div>
      )}
    </div>
  )
}

// ── Mini card (draggable) ─────────────────────────────────────────────────────
function DraggableCard({
  entry,
  onClick,
  activeChannel,
}: {
  entry: PostEntry
  onClick: (id: string) => void
  activeChannel: ChannelSlug | 'all'
}) {
  const draggableId = `${entry.post.id}::${format(new Date(entry.date), 'yyyy-MM-dd')}`

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { postId: entry.post.id, sourceDate: entry.date },
  })

  const slugs = entry.post.post_channels
    .map((pc) => pc.channel?.slug)
    .filter(Boolean) as string[]

  const copy = displayCopy(entry.post, activeChannel)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex cursor-grab items-center gap-1.5 rounded-[7px] border border-[#E5E5E5] bg-white px-1.5 py-1 shadow-sm',
        'transition-opacity active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <PostThumb post={entry.post} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className="truncate text-[11px] font-medium leading-tight text-neutral-800"
          data-no-dnd="true"
          onClick={(e) => { e.stopPropagation(); onClick(entry.post.id) }}
          style={{ cursor: 'pointer' }}
        >
          {copy ?? <span className="font-normal italic text-neutral-400">Sin copy</span>}
        </p>
        {slugs.length > 0 && (
          <div className="mt-0.5 flex items-center gap-0.5">
            {slugs.slice(0, 3).map((slug) => (
              <ChannelIcon key={slug} slug={slug as ChannelSlug} size={9} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ghost card for DragOverlay ────────────────────────────────────────────────
function GhostCard({ post, activeChannel }: { post: PostWithDetails; activeChannel: ChannelSlug | 'all' }) {
  const slugs = post.post_channels
    .map((pc) => pc.channel?.slug)
    .filter(Boolean) as string[]

  const copy = displayCopy(post, activeChannel)

  return (
    <div className="flex w-44 cursor-grabbing items-center gap-1.5 rounded-[7px] border border-neutral-300 bg-white px-1.5 py-1 shadow-xl ring-1 ring-neutral-200 opacity-95">
      <PostThumb post={post} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[11px] font-medium leading-tight text-neutral-800">
          {copy ?? <span className="font-normal italic text-neutral-400">Sin copy</span>}
        </p>
        {slugs.length > 0 && (
          <div className="mt-0.5 flex items-center gap-0.5">
            {slugs.slice(0, 3).map((slug) => (
              <ChannelIcon key={slug} slug={slug as ChannelSlug} size={9} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Droppable day cell ────────────────────────────────────────────────────────
function DroppableDay({
  day,
  inMonth,
  today,
  entries,
  onCardClick,
  onAddClick,
  activeChannel,
  todayRef,
}: {
  day: Date
  inMonth: boolean
  today: boolean
  entries: PostEntry[]
  onCardClick: (id: string) => void
  activeChannel: ChannelSlug | 'all'
  onAddClick: () => void
  todayRef?: React.RefObject<HTMLDivElement | null>
}) {
  const isoDay = format(day, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({ id: isoDay })

  const visible = entries.slice(0, 3)
  const overflow = entries.length - 3

  return (
    <div ref={today ? todayRef : undefined}>
      <div
        ref={setNodeRef}
        className={cn(
          'group relative min-h-28 rounded-lg p-1.5 transition-colors',
          inMonth ? 'bg-white border border-[#D9D9D9]' : 'bg-neutral-50/70 border border-[#E8E8E8]',
          today && 'border-neutral-400 ring-1 ring-neutral-300',
          isOver && inMonth && 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200',
        )}
      >
        <div className={cn(
          'mb-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-medium',
          today    ? 'bg-[#0A0A0A] text-white'
          : inMonth ? 'text-neutral-700'
          :           'text-neutral-300',
        )}>
          {format(day, 'd')}
        </div>

        <div className="space-y-0.5">
          {visible.map((entry) => (
            <DraggableCard
              key={`${entry.post.id}-${isoDay}`}
              entry={entry}
              onClick={onCardClick}
              activeChannel={activeChannel}
            />
          ))}
          {overflow > 0 && (
            <p className="cursor-default px-1 text-[10.5px] text-neutral-400">
              +{overflow} más
            </p>
          )}
        </div>

        {inMonth && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddClick() }}
            className="absolute right-1.5 top-1.5 flex items-center justify-center text-[#BBBBBB] opacity-0 transition-opacity duration-150 hover:text-[#888888] group-hover:opacity-100"
            style={{ width: 30, height: 30, borderRadius: 6, border: '1.5px dashed #CCCCCC' }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Month section ─────────────────────────────────────────────────────────────
function MonthSection({
  monthDate,
  sourcePosts,
  activeChannel,
  onCardClick,
  onAddClick,
  todayRef,
  bg,
}: {
  monthDate: Date
  sourcePosts: PostWithDetails[]
  activeChannel: ChannelSlug | 'all'
  onCardClick: (id: string) => void
  onAddClick: (day: Date) => void
  todayRef: React.RefObject<HTMLDivElement | null>
  bg: string
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(monthDate),     { weekStartsOn: 1 }),
  }).filter((d) => getDay(d) !== 0 && getDay(d) !== 6)

  const monthLabel = `${MONTHS_ES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  function getEntriesForDay(day: Date): PostEntry[] {
    const seen = new Set<string>()
    const entries: PostEntry[] = []
    sourcePosts.forEach((p) => {
      p.post_channels.forEach((pc) => {
        if (!pc.channel?.slug) return
        if (activeChannel !== 'all' && pc.channel.slug !== activeChannel) return
        const date = pc.scheduled_at || p.scheduled_at
        if (!date || !isSameDay(new Date(date), day)) return
        if (seen.has(p.id)) return
        seen.add(p.id)
        entries.push({ post: p, date })
      })
    })
    return entries
  }

  return (
    <div>
      <div className="sticky top-[44px] z-10 px-4 py-2" style={{ background: bg }}>
        <span className="text-[13px] font-bold text-[#0A0A0A]">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-5 gap-1 px-4 pb-4">
        {days.map((day) => (
          <DroppableDay
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, monthDate)}
            today={isToday(day)}
            entries={getEntriesForDay(day)}
            onCardClick={onCardClick}
            onAddClick={() => onAddClick(day)}
            activeChannel={activeChannel}
            todayRef={todayRef}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function CalendarView({
  posts,
  activeChannel = 'all',
  loading = false,
  history,
}: {
  posts: PostWithDetails[]
  activeChannel?: ChannelSlug | 'all'
  loading?: boolean
  history?: CalendarHistoryConfig
}) {
  const { openPost, openNewPost, patchPost } = usePostStore()
  const todayRef = useRef<HTMLDivElement | null>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const today        = new Date()
  const futureMonths = [today, addMonths(today, 1), addMonths(today, 2)]
  const historyMonths = [subMonths(today, 2), subMonths(today, 1)]

  // ── Drag handlers ───────────────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    const postId = (active.data.current as { postId?: string })?.postId ?? null
    setActivePostId(postId)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActivePostId(null)
    if (!over) return

    const data       = active.data.current as { postId: string; sourceDate: string }
    const postId     = data?.postId
    const sourceDate = data?.sourceDate
    const targetDay  = String(over.id)

    if (!postId || !sourceDate) return

    const original = new Date(sourceDate)
    const target   = new Date(`${targetDay}T00:00:00`)
    target.setHours(original.getHours(), original.getMinutes(), 0, 0)

    if (isSameDay(original, target)) return

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const deltaMs = target.getTime() - original.getTime()

    const shiftedChannels = post.post_channels.map((pc) => ({
      ...pc,
      scheduled_at: pc.scheduled_at
        ? new Date(new Date(pc.scheduled_at).getTime() + deltaMs).toISOString()
        : pc.scheduled_at,
    }))

    patchPost(postId, {
      scheduled_at: target.toISOString(),
      status: 'scheduled',
      post_channels: shiftedChannels,
    })

    try {
      await updatePostScheduledAt(postId, target.toISOString())

      for (const pc of post.post_channels) {
        if (!pc.scheduled_at || !pc.channel_id) continue
        const shifted = new Date(new Date(pc.scheduled_at).getTime() + deltaMs).toISOString()
        await upsertChannelScheduledAt(postId, pc.channel_id, shifted, post.status)
      }

      toast.success('Fecha actualizada')
    } catch (err) {
      patchPost(postId, {
        scheduled_at: post.scheduled_at,
        status: post.status,
        post_channels: post.post_channels,
      })
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al mover el post: ${msg}`)
    }
  }

  const activePost = activePostId ? posts.find((p) => p.id === activePostId) ?? null : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3.5"
          style={{
            background: 'rgba(255,255,255,0.5)',
            ...GLASS_BF,
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* History toggle */}
          {history && (
            history.visible ? (
              <GlassButton
                onClick={history.onHide}
                className="px-2.5 py-1 text-[12px]"
                style={GLASS_BF}
              >
                Ocultar historial
              </GlassButton>
            ) : (
              <GlassButton
                onClick={history.onLoad}
                disabled={history.loading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[12px]"
                style={GLASS_BF}
              >
                {history.loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Ver historial
              </GlassButton>
            )
          )}
          {!history && <div />}

          {/* Hoy */}
          <GlassButton
            onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="px-2.5 py-1 text-[12px]"
            style={GLASS_BF}
          >
            Hoy
          </GlassButton>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">

          {loading ? <CalendarSkeleton /> : null}

          {!loading && (
            <>
              {/* Sticky weekday labels */}
              <div
                className="sticky top-0 z-20 mb-1 grid grid-cols-5 gap-1 px-4 pt-3 pb-1"
                style={{ background: BG }}
              >
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#999999' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* ── History section ── */}
              {history?.visible && (
                <>
                  {/* Load more (older) at the top */}
                  {history.hasMore && (
                    <div className="flex justify-center px-4 py-2">
                      <button
                        onClick={history.onLoadMore}
                        disabled={history.loading}
                        className="flex items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {history.loading && <Loader2 className="h-3 w-3 animate-spin" />}
                        Cargar más
                      </button>
                    </div>
                  )}

                  {historyMonths.map((monthDate, mi) => (
                    <MonthSection
                      key={`h-${mi}`}
                      monthDate={monthDate}
                      sourcePosts={history.posts}
                      activeChannel={activeChannel}
                      onCardClick={(id) => openPost(id)}
                      onAddClick={(day) => openNewPost({ scheduled_at: day.toISOString() })}
                      todayRef={todayRef}
                      bg={BG}
                    />
                  ))}

                  {/* Separator */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-px flex-1 bg-neutral-200" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                      Historial
                    </span>
                    <div className="h-px flex-1 bg-neutral-200" />
                  </div>
                </>
              )}

              {/* ── Future months ── */}
              {futureMonths.map((monthDate, mi) => (
                <MonthSection
                  key={`f-${mi}`}
                  monthDate={monthDate}
                  sourcePosts={posts}
                  activeChannel={activeChannel}
                  onCardClick={(id) => openPost(id)}
                  onAddClick={(day) => openNewPost({ scheduled_at: day.toISOString() })}
                  todayRef={todayRef}
                  bg={BG}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Drag ghost */}
      <DragOverlay dropAnimation={null}>
        {activePost && <GhostCard post={activePost} activeChannel={activeChannel} />}
      </DragOverlay>
    </DndContext>
  )
}
