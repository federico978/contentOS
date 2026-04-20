'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, subWeeks, getDay, format,
} from 'date-fns'
import { ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPostsFrom, fetchReviewPostsHistory } from '@/lib/api/posts'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton'

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const CHANNEL_FILTERS: { slug: ChannelSlug | 'all'; label: string }[] = [
  { slug: 'all',       label: 'Todos'     },
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn'  },
  { slug: 'x',         label: 'X'         },
]

// White background (page bg is white for reviewer-calendar)
const BG = 'oklch(1 0 0)'

// ── Types ─────────────────────────────────────────────────────────────────────

type CalendarEntry = {
  post:        ReviewPost
  channelSlug: ChannelSlug
  date:        string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PostThumb({ post }: { post: ReviewPost }) {
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
        <VideoThumbnail src={video.url} className="h-full w-full object-cover pointer-events-none" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-3.5 w-3.5 text-neutral-300" />
        </div>
      )}
    </div>
  )
}

function approvalBorderColor(post: ReviewPost): string {
  const approvals = post.post_approvals ?? []
  if (approvals.some((a) => a.status === 'rejected')) return '#EF4444'
  if (approvals.some((a) => a.status === 'approved'))  return '#22C55E'
  return '#D1D5DB'
}

function CalendarCard({
  entry,
  selected,
  onClick,
}: {
  entry:    CalendarEntry
  selected: boolean
  onClick:  (entry: CalendarEntry) => void
}) {
  const leftColor = approvalBorderColor(entry.post)

  return (
    <div
      data-calendar-card="true"
      onClick={() => onClick(entry)}
      style={{ borderLeftColor: leftColor }}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-[7px] border-t border-r border-b border-l-4 px-1.5 py-1 shadow-sm transition-colors',
        selected
          ? 'border-blue-300 bg-blue-50 shadow-[0_0_0_1.5px_rgba(59,130,246,0.25)]'
          : 'border-[#E5E5E5] bg-white hover:bg-neutral-50',
      )}
    >
      <PostThumb post={entry.post} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[11px] font-medium leading-tight text-neutral-800">
          {entry.post.post_channels.find((pc) => pc.channel?.slug === entry.channelSlug)?.copy_override ||
           entry.post.copy || (
            <span className="font-normal italic text-neutral-400">Sin copy</span>
          )}
        </p>
        <div className="mt-0.5">
          <ChannelIcon slug={entry.channelSlug} size={10} />
        </div>
      </div>
    </div>
  )
}

function CalendarDay({
  day,
  inMonth,
  entries,
  selectedKey,
  onEntryClick,
  todayRef,
}: {
  day:          Date
  inMonth:      boolean
  entries:      CalendarEntry[]
  selectedKey:  string | null
  onEntryClick: (entry: CalendarEntry) => void
  todayRef?:    React.RefObject<HTMLDivElement | null>
}) {
  const visible  = entries.slice(0, 4)
  const overflow = entries.length - 4
  const today    = isToday(day)

  return (
    <div ref={today ? todayRef : undefined}>
      <div className={cn(
        'min-h-28 rounded-lg p-1.5',
        inMonth ? 'bg-white border border-[#D9D9D9]' : 'bg-neutral-50/70 border border-[#E8E8E8]',
        today && 'border-neutral-400 ring-1 ring-neutral-300',
      )}>
        <div className={cn(
          'mb-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-medium',
          today     ? 'bg-[#0A0A0A] text-white'
          : inMonth ? 'text-neutral-700'
          :           'text-neutral-300',
        )}>
          {format(day, 'd')}
        </div>

        <div className="space-y-0.5">
          {visible.map((entry, i) => {
            const key = `${entry.post.id}-${entry.channelSlug}`
            return (
              <CalendarCard
                key={`${key}-${i}`}
                entry={entry}
                selected={selectedKey === key}
                onClick={onEntryClick}
              />
            )
          })}
          {overflow > 0 && (
            <p className="cursor-default px-1 text-[10.5px] text-neutral-400">+{overflow} más</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Month section helper ──────────────────────────────────────────────────────

function MonthSection({
  monthDate,
  sourcePosts,
  activeChannel,
  selectedKey,
  onEntryClick,
  todayRef,
}: {
  monthDate:    Date
  sourcePosts:  ReviewPost[]
  activeChannel: ChannelSlug | 'all'
  selectedKey:  string | null
  onEntryClick: (entry: CalendarEntry) => void
  todayRef:     React.RefObject<HTMLDivElement | null>
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(monthDate),     { weekStartsOn: 1 }),
  }).filter((d) => getDay(d) !== 0 && getDay(d) !== 6)

  const monthLabel = `${MONTHS_ES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  function getEntriesForDay(day: Date): CalendarEntry[] {
    const entries: CalendarEntry[] = []
    sourcePosts.forEach((post) => {
      post.post_channels.forEach((pc) => {
        const slug = pc.channel?.slug as ChannelSlug | undefined
        if (!slug) return
        if (activeChannel !== 'all' && slug !== activeChannel) return
        const date = pc.scheduled_at ?? post.scheduled_at
        if (!date || !isSameDay(new Date(date), day)) return
        entries.push({ post, channelSlug: slug, date })
      })
    })
    return entries
  }

  return (
    <div>
      <div className="sticky top-[44px] z-10 px-4 py-2" style={{ background: BG }}>
        <span className="text-[13px] font-bold text-[#0A0A0A]">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-5 gap-1 px-4 pb-4">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, monthDate)}
            entries={getEntriesForDay(day)}
            selectedKey={selectedKey}
            onEntryClick={onEntryClick}
            todayRef={todayRef}
          />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewerCalendarPage() {
  const [posts,         setPosts]         = useState<ReviewPost[]>([])
  const [loading,       setLoading]       = useState(true)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [userName,      setUserName]      = useState<string>('')
  const [activeChannel, setActiveChannel] = useState<ChannelSlug | 'all'>('all')
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null)

  // History state
  const [historyPosts,   setHistoryPosts]   = useState<ReviewPost[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyOffset,  setHistoryOffset]  = useState(0)

  const panelRef     = useRef<HTMLDivElement>(null)
  const todayRef     = useRef<HTMLDivElement | null>(null)
  const didScrollRef = useRef(false)

  // Close panel on click-outside; clicking a card switches selection instead of closing
  useEffect(() => {
    if (!selectedEntry) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element
      if (panelRef.current?.contains(target)) return
      if (target.closest('[data-calendar-card]')) return
      setSelectedEntry(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [selectedEntry])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setUserId(user.id)
        setUserName(
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email ??
          'Reviewer',
        )
      }
    })
  }, [])

  // Initial load: only from current week onwards
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
        setPosts(await fetchReviewPostsFrom(weekStart))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Auto-scroll to today after initial load
  useEffect(() => {
    if (!loading && !didScrollRef.current) {
      didScrollRef.current = true
      requestAnimationFrame(() => {
        todayRef.current?.scrollIntoView({ block: 'start' })
      })
    }
  }, [loading])

  // ── History helpers ──────────────────────────────────────────────────────────
  const historyRange = useCallback(() => ({
    fromISO: subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 8).toISOString(),
    toISO:   startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
  }), [])

  const handleLoadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { fromISO, toISO } = historyRange()
      const { data, hasMore } = await fetchReviewPostsHistory(fromISO, toISO, 0)
      setHistoryPosts(data)
      setHistoryHasMore(hasMore)
      setHistoryOffset(data.length)
      setHistoryVisible(true)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyRange])

  const handleHideHistory = useCallback(() => {
    setHistoryVisible(false)
    setHistoryPosts([])
    setHistoryHasMore(false)
    setHistoryOffset(0)
  }, [])

  const handleLoadMoreHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { fromISO, toISO } = historyRange()
      const { data, hasMore } = await fetchReviewPostsHistory(fromISO, toISO, historyOffset)
      setHistoryPosts((prev) => [...prev, ...data])
      setHistoryHasMore(hasMore)
      setHistoryOffset((prev) => prev + data.length)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyRange, historyOffset])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const today         = new Date()
  const futureMonths  = [today, addMonths(today, 1), addMonths(today, 2)]
  const historyMonths = [subMonths(today, 2), subMonths(today, 1)]

  function handleEntryClick(entry: CalendarEntry) {
    const key = `${entry.post.id}-${entry.channelSlug}`
    setSelectedEntry((prev) =>
      prev && `${prev.post.id}-${prev.channelSlug}` === key ? null : entry,
    )
  }

  function handleApprovalChange(postId: string, approvals: PostApproval[]) {
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, post_approvals: approvals } : p),
    )
    setSelectedEntry((prev) => {
      if (!prev || prev.post.id !== postId) return prev
      return { ...prev, post: { ...prev.post, post_approvals: approvals } }
    })
  }

  function handleCommentAdded(postId: string, comment: PostComment) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, post_comments: [...(p.post_comments ?? []), comment] } : p,
      ),
    )
    setSelectedEntry((prev) => {
      if (!prev || prev.post.id !== postId) return prev
      return { ...prev, post: { ...prev.post, post_comments: [...(prev.post.post_comments ?? []), comment] } }
    })
  }

  const selectedKey = selectedEntry ? `${selectedEntry.post.id}-${selectedEntry.channelSlug}` : null
  const panelOpen   = selectedEntry !== null

  const sharedMonthProps = {
    activeChannel,
    selectedKey,
    onEntryClick: handleEntryClick,
    todayRef,
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-black text-[#0A0A0A]">Calendario</h1>
          {historyVisible ? (
            <button
              onClick={handleHideHistory}
              className="rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
            >
              Ocultar historial
            </button>
          ) : (
            <button
              onClick={handleLoadHistory}
              disabled={historyLoading}
              className="flex items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {historyLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              Ver historial
            </button>
          )}
        </div>
        <button
          onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          Hoy
        </button>
      </div>

      {/* Channel filter */}
      <div className="flex shrink-0 justify-center border-b border-[#E5E5E5]">
        {CHANNEL_FILTERS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => setActiveChannel(slug)}
            className={cn(
              '-mb-px flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-[15px] font-medium transition-colors',
              activeChannel === slug
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            {slug !== 'all' && <ChannelIcon slug={slug as ChannelSlug} size={20} gray={activeChannel !== slug} />}
            {label}
          </button>
        ))}
      </div>

      {/* Calendar + Panel */}
      <div className="relative flex-1 overflow-hidden">

        {/* Scrollable grid */}
        <div
          className={cn(
            'h-full overflow-y-auto pb-4 transition-[padding] duration-300',
            panelOpen ? 'pr-[400px]' : 'pr-4',
          )}
        >
          {loading ? (
            <div className="px-4 pt-3">
              <CalendarSkeleton />
            </div>
          ) : (
            <>
              {/* Sticky weekday labels */}
              <div
                className="sticky top-0 z-20 mb-1 grid grid-cols-5 gap-1 px-4 pt-3 pb-1"
                style={{ background: BG }}
              >
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* ── History section ── */}
              {historyVisible && (
                <>
                  {historyHasMore && (
                    <div className="flex justify-center px-4 py-2">
                      <button
                        onClick={handleLoadMoreHistory}
                        disabled={historyLoading}
                        className="flex items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {historyLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        Cargar más
                      </button>
                    </div>
                  )}

                  {historyMonths.map((monthDate, mi) => (
                    <MonthSection
                      key={`h-${mi}`}
                      monthDate={monthDate}
                      sourcePosts={historyPosts}
                      {...sharedMonthProps}
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
                  {...sharedMonthProps}
                />
              ))}
            </>
          )}
        </div>

        {/* Sliding review panel */}
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 top-0 h-full w-[380px] border-l border-[#E5E5E5] bg-white shadow-[-6px_0_30px_rgba(0,0,0,0.08)] transition-transform duration-300',
            panelOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          {selectedEntry && userId && (
            <ReviewPanel
              post={selectedEntry.post}
              userId={userId}
              userName={userName}
              activeChannel={selectedEntry.channelSlug}
              onClose={() => setSelectedEntry(null)}
              onApprovalChange={handleApprovalChange}
              onCommentAdded={handleCommentAdded}
            />
          )}
        </div>
      </div>
    </div>
  )
}
