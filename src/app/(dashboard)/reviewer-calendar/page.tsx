'use client'

import { useEffect, useRef, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, getDay, format,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPosts } from '@/lib/api/posts'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'
import { ReviewPanel } from '@/components/review/ReviewPanel'

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

function CalendarCard({
  entry,
  selected,
  onClick,
}: {
  entry:    CalendarEntry
  selected: boolean
  onClick:  (entry: CalendarEntry) => void
}) {
  return (
    <div
      onClick={() => onClick(entry)}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-[7px] border px-1.5 py-1 shadow-sm transition-colors',
        selected
          ? 'border-blue-300 bg-blue-50 shadow-[0_0_0_1.5px_rgba(59,130,246,0.25)]'
          : 'border-[#E5E5E5] bg-white hover:bg-neutral-50',
      )}
    >
      <PostThumb post={entry.post} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[11px] font-medium leading-tight text-neutral-800">
          {entry.post.title || 'Untitled'}
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
}: {
  day:          Date
  inMonth:      boolean
  entries:      CalendarEntry[]
  selectedKey:  string | null
  onEntryClick: (entry: CalendarEntry) => void
}) {
  const visible  = entries.slice(0, 4)
  const overflow = entries.length - 4

  return (
    <div className={cn(
      'min-h-28 rounded-lg p-1.5',
      inMonth ? 'bg-white border border-[#D9D9D9]' : 'bg-transparent',
      isToday(day) && 'border-neutral-400 ring-1 ring-neutral-300',
    )}>
      <div className={cn(
        'mb-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-medium',
        isToday(day)  ? 'bg-[#0A0A0A] text-white'
        : inMonth     ? 'text-neutral-700'
        :               'text-neutral-300',
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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewerCalendarPage() {
  const [posts,         setPosts]         = useState<ReviewPost[]>([])
  const [loading,       setLoading]       = useState(true)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [userName,      setUserName]      = useState<string>('')
  const [currentDate,   setCurrentDate]   = useState(new Date())
  const [activeChannel, setActiveChannel] = useState<ChannelSlug | 'all'>('all')
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const gridRef  = useRef<HTMLDivElement>(null)

  // Close panel on click-outside, but let grid card clicks switch the selection
  useEffect(() => {
    if (!selectedEntry) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element
      if (panelRef.current?.contains(target)) return  // inside panel
      if (gridRef.current?.contains(target)) return   // inside calendar grid
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

  useEffect(() => {
    async function load() {
      setLoading(true)
      try { setPosts(await fetchReviewPosts()) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Mon–Fri days for the current month view
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(currentDate),     { weekStartsOn: 1 }),
  }).filter((d) => getDay(d) !== 0 && getDay(d) !== 6)

  const monthLabel = `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // One entry per (post × channel) pair on a given day
  function getEntriesForDay(day: Date): CalendarEntry[] {
    const entries: CalendarEntry[] = []
    posts.forEach((post) => {
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

  const selectedKey  = selectedEntry ? `${selectedEntry.post.id}-${selectedEntry.channelSlug}` : null
  const panelOpen    = selectedEntry !== null

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <h1 className="text-[14px] font-black text-[#0A0A0A]">Calendario</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-[13px] font-semibold text-[#0A0A0A]">
            {monthLabel}
          </span>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Channel filter */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[#E5E5E5] px-6 py-2.5">
        {CHANNEL_FILTERS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => setActiveChannel(slug)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
              activeChannel === slug
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700',
            )}
          >
            {slug !== 'all' && <ChannelIcon slug={slug as ChannelSlug} size={12} gray={activeChannel !== slug} />}
            {label}
          </button>
        ))}
      </div>

      {/* Calendar + Panel */}
      <div className="relative flex-1 overflow-hidden">

        {/* Scrollable grid */}
        <div
          ref={gridRef}
          className={cn(
            'h-full overflow-y-auto px-4 pb-4 pt-3 transition-[padding] duration-300',
            panelOpen ? 'pr-[400px]' : 'pr-4',
          )}
        >
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
            </div>
          ) : (
            <>
              {/* Weekday labels */}
              <div className="mb-1 grid grid-cols-5 gap-1">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-5 gap-1">
                {days.map((day) => (
                  <CalendarDay
                    key={day.toISOString()}
                    day={day}
                    inMonth={isSameMonth(day, currentDate)}
                    entries={getEntriesForDay(day)}
                    selectedKey={selectedKey}
                    onEntryClick={setSelectedEntry}
                  />
                ))}
              </div>
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
