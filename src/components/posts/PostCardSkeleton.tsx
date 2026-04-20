import { Skeleton } from '@/components/ui/skeleton'

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#D9D9D9] bg-white">
      {/* Thumbnail */}
      <Skeleton className="h-40 w-full rounded-none" />
      {/* Body */}
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
        <Skeleton className="h-2.5 w-1/3 rounded-full" />
      </div>
    </div>
  )
}
