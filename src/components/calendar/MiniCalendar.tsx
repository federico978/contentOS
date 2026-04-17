'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, getDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { PostWithDetails, ChannelSlug } from '@/lib/types'
import { cn } from '@/lib/utils'

const WEEKDAYS   = ['L', 'M', 'X', 'J', 'V']
const MONTHS_ES  = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const DOT_COLOR: Record<string, string> = {
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  x:         '#000000',
}

// ── Droppable day wrapper ──────────────────────────────────────────────────────
function DroppableDay({
  day,
  inMonth,
  className,
  onClick,
  children,
}: {
  day: Date
  inMonth: boolean
  className: string
  onClick: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
    disabled: !inMonth,
  })

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      disabled={!inMonth}
      className={cn(
        className,
        isOver && inMonth && 'ring-2 ring-emerald-400 bg-emerald-50',
      )}
    >
      {children}
    </button>
  )
}

interface Props {
  posts: PostWithDetails[]
  hoveredPostId: string | null
  selectedDate: string | null
  onDayClick: (isoDate: string | null) => void
  droppedDate?: string | null
  activeChannel?: ChannelSlug | 'all'
}

export function MiniCalendar({ posts, hoveredPostId, selectedDate, onDayClick, droppedDate, activeChannel = 'all' as const }: Props) {
  const [current, setCurrent] = useState(new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(current),   { weekStartsOn: 1 }),
  }).filter((d) => getDay(d) !== 0 && getDay(d) !== 6)

  const hoveredPost = hoveredPostId ? posts.find((p) => p.id === hoveredPostId) : null
  const hoveredDay = (() => {
    if (!hoveredPost) return null
    if (activeChannel !== 'all') {
      const pc = hoveredPost.post_channels.find((c) => c.channel?.slug === activeChannel)
      const d = pc?.scheduled_at || hoveredPost.scheduled_at
      return d ? new Date(d) : null
    }
    return hoveredPost.scheduled_at ? new Date(hoveredPost.scheduled_at) : null
  })()
  const selectedDay = selectedDate ? new Date(selectedDate) : null
  const droppedDay  = droppedDate  ? new Date(droppedDate)  : null

  function channelsForDay(day: Date): string[] {
    const seen = new Set<string>()
    posts.forEach((p) => {
      p.post_channels.forEach((pc) => {
        if (!pc.channel?.slug) return
        if (activeChannel !== 'all' && pc.channel.slug !== activeChannel) return
        const date = pc.scheduled_at || p.scheduled_at
        if (!date || !isSameDay(new Date(date), day)) return
        seen.add(pc.channel.slug)
      })
    })
    return Array.from(seen)
  }

  function handleClick(day: Date) {
    if (selectedDay && isSameDay(day, selectedDay)) {
      onDayClick(null)
    } else {
      onDayClick(day.toISOString())
    }
  }

  return (
    <div className="select-none">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setCurrent(subMonths(current, 1))}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[12px] font-semibold text-neutral-700">
          {MONTHS_ES[current.getMonth()]} {current.getFullYear()}
        </span>
        <button
          onClick={() => setCurrent(addMonths(current, 1))}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-5 gap-y-0.5">
        {days.map((day) => {
          const inMonth    = isSameMonth(day, current)
          const today      = isToday(day)
          const isHovered  = hoveredDay ? isSameDay(day, hoveredDay) : false
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const isDropped  = droppedDay  ? isSameDay(day, droppedDay)  : false
          const channels   = channelsForDay(day)

          return (
            <DroppableDay
              key={day.toISOString()}
              day={day}
              inMonth={inMonth}
              onClick={() => inMonth && handleClick(day)}
              className={cn(
                'flex flex-col items-center gap-[3px] rounded-lg py-1.5 transition-all',
                inMonth ? 'cursor-pointer hover:bg-neutral-100' : 'pointer-events-none opacity-25',
                isSelected && 'bg-[#0A0A0A] hover:bg-neutral-800',
                isHovered && !isSelected && 'bg-neutral-100 ring-1 ring-neutral-300',
                isDropped && !isSelected && 'bg-emerald-50 ring-2 ring-emerald-400',
              )}
            >
              {/* Day number */}
              <span className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-medium leading-none',
                today && !isSelected && 'bg-[#0A0A0A]',
                (today || isSelected) ? 'text-white' : isDropped ? 'text-emerald-700' : 'text-neutral-700',
              )}>
                {day.getDate()}
              </span>

              {/* Channel dots */}
              {channels.length > 0 ? (
                <div className="flex items-center gap-[3px]">
                  {channels.map((slug) => (
                    <span
                      key={slug}
                      className="rounded-full transition-all duration-150"
                      style={{
                        width:           isHovered ? 7 : 5,
                        height:          isHovered ? 7 : 5,
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.75)'
                          : (DOT_COLOR[slug] ?? '#999'),
                        boxShadow: isHovered && !isSelected
                          ? `0 0 0 1.5px white, 0 0 0 3px ${DOT_COLOR[slug] ?? '#999'}`
                          : undefined,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="h-[7px]" />
              )}
            </DroppableDay>
          )
        })}
      </div>

      {/* Clear filter hint */}
      {selectedDay && (
        <button
          onClick={() => onDayClick(null)}
          className="mt-3 w-full rounded-md border border-[#D9D9D9] py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          Mostrar todos los posts
        </button>
      )}
    </div>
  )
}
