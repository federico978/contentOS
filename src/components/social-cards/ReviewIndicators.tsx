'use client'

import { cn } from '@/lib/utils'
import { PostApproval, PostComment } from '@/lib/types'

function initials(a: PostApproval): string {
  const name = a.user_profiles?.full_name
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  const email = a.user_profiles?.email ?? ''
  return email.slice(0, 2).toUpperCase()
}

export function ReviewIndicators({
  approvals,
  comments,
}: {
  approvals?: PostApproval[]
  comments?: PostComment[]
}) {
  const hasComments = (comments?.length ?? 0) > 0
  const hasVotes    = (approvals?.length ?? 0) > 0
  if (!hasComments && !hasVotes) return null

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Comment indicator */}
      {hasComments && (
        <div className="flex items-center gap-1">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F3F4F6]">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="#374151">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-neutral-400">{comments!.length}</span>
        </div>
      )}

      {/* Vote avatars */}
      {hasVotes && (
        <div className="flex items-center">
          {approvals!.slice(0, 3).map((a, i) => (
            <div
              key={a.id}
              style={{ marginLeft: i > 0 ? -4 : 0 }}
              className={cn(
                'flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-semibold text-white ring-1 ring-white',
                a.status === 'approved' ? 'bg-[#22C55E]' : 'bg-[#F97316]',
              )}
            >
              {initials(a)}
            </div>
          ))}
          {approvals!.length > 3 && (
            <div
              style={{ marginLeft: -4 }}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-neutral-200 text-[9px] font-semibold text-neutral-500 ring-1 ring-white"
            >
              +{approvals!.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
