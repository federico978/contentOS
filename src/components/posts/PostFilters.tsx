'use client'

import { Search, X, ArrowDownUp, ChevronDown } from 'lucide-react'
import { usePostStore, ApprovalFilterValue } from '@/store/usePostStore'
import { CHANNELS } from '@/lib/constants'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { GlassButton } from '@/components/ui/glass-button'
import { PostStatus, ChannelSlug } from '@/lib/types'

const STATUSES: { value: PostStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
]

const COLS = [2, 3, 4] as const

const APPROVAL_OPTIONS: { value: ApprovalFilterValue; label: string }[] = [
  { value: 'all',      label: 'Aprobación' },
  { value: 'pending',  label: 'Pendiente'  },
  { value: 'approved', label: 'Aprobado'   },
  { value: 'rejected', label: 'Rechazado'  },
  { value: 'mixed',    label: 'Mixto'      },
]

function ColIcon({ cols }: { cols: 2 | 3 | 4 }) {
  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 5px)`, gridTemplateRows: 'repeat(2, 5px)' }}
    >
      {Array.from({ length: cols * 2 }, (_, i) => (
        <div key={i} className="rounded-[1px] bg-current" />
      ))}
    </div>
  )
}

export function PostFilters() {
  const { filters, setFilters } = usePostStore()

  function toggleChannel(slug: ChannelSlug) {
    setFilters({ channel: filters.channel === slug ? null : slug })
  }

  function toggleStatus(status: PostStatus) {
    setFilters({ status: filters.status === status ? null : status })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Channel filter — icon-only toggles, no "All" button */}
      <div className="flex items-center gap-1">
        {CHANNELS.map(({ slug }) => (
          <GlassButton
            key={slug}
            active={filters.channel === slug}
            onClick={() => toggleChannel(slug as ChannelSlug)}
            className="flex items-center justify-center px-2 py-2"
          >
            <ChannelIcon slug={slug} size={18} />
          </GlassButton>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-black/10" />

      {/* Status filter — text toggles, no "All" button */}
      <div className="flex items-center gap-1">
        {STATUSES.map(({ value, label }) => (
          <GlassButton
            key={value}
            active={filters.status === value}
            onClick={() => toggleStatus(value)}
            className="px-4 py-2 text-[12px]"
          >
            {label}
          </GlassButton>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-black/10" />

      {/* Approval filter */}
      <div className="relative">
        <select
          value={filters.approval}
          onChange={(e) => setFilters({ approval: e.target.value as ApprovalFilterValue })}
          className="appearance-none cursor-pointer rounded-full py-2 pl-3 pr-7 text-[12px] outline-none transition-all duration-150"
          style={
            filters.approval !== 'all'
              ? {
                  background: 'rgba(0,0,0,0.08)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  color: '#111111',
                  fontWeight: 500,
                }
              : {
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  color: '#555555',
                }
          }
        >
          {APPROVAL_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-black/10" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          placeholder="Search posts..."
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ search: e.target.value })}
          className="h-7 w-44 rounded-full pl-8 pr-7 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-150 focus:ring-2 focus:ring-black/10"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        />
        {filters.search && (
          <button
            onClick={() => setFilters({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-black/10" />

      {/* Sort toggle */}
      <div className="flex items-center gap-1">
        <GlassButton
          active={filters.sort === 'created'}
          onClick={() => setFilters({ sort: 'created' })}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px]"
        >
          <ArrowDownUp className="h-3 w-3" />
          Último agregado
        </GlassButton>
        <GlassButton
          active={filters.sort === 'scheduled'}
          onClick={() => setFilters({ sort: 'scheduled' })}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px]"
        >
          <ArrowDownUp className="h-3 w-3" />
          Fecha de publicación
        </GlassButton>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="h-4 w-px bg-black/10" />

      {/* Column selector */}
      <div className="flex items-center gap-1">
        {COLS.map((n) => (
          <GlassButton
            key={n}
            active={filters.columns === n}
            onClick={() => setFilters({ columns: n })}
            title={`${n} columns`}
            className="flex items-center justify-center px-2 py-1.5"
          >
            <ColIcon cols={n} />
          </GlassButton>
        ))}
      </div>
    </div>
  )
}
