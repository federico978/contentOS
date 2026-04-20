import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// Sparse pattern: which cells in a 5×4 grid get skeleton cards (and how many)
const CARD_COUNTS: number[] = [
  0, 1, 0, 2, 0,
  1, 0, 2, 0, 1,
  0, 2, 0, 1, 0,
  1, 0, 1, 0, 2,
]

function SkeletonCard() {
  return (
    <div className="flex items-center gap-1.5 rounded-[7px] border border-[#E5E5E5] bg-white px-1.5 py-1 shadow-sm">
      <Skeleton className="h-8 w-8 shrink-0 rounded-[5px]" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-1.5 w-2/3 rounded-full" />
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="px-4 pb-4 pt-3">
      {/* Weekday headers */}
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
        {CARD_COUNTS.map((count, i) => (
          <div key={i} className="min-h-28 rounded-lg border border-[#D9D9D9] bg-white p-1.5">
            {/* Day number placeholder */}
            <Skeleton className="mb-1.5 h-5 w-5 rounded-full" />
            {/* Optional skeleton cards */}
            <div className="space-y-0.5">
              {Array.from({ length: count }).map((_, j) => (
                <SkeletonCard key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
