'use client'

import { useEffect, useRef, useState } from 'react'
import { LayoutList, LayoutGrid, AlignJustify, CheckCircle2, Loader2, ChevronDown, Check, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPosts } from '@/lib/api/posts'
import { upsertApproval, deleteApproval } from '@/lib/api/profiles'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { InstagramPostCard } from '@/components/social-cards/InstagramPostCard'
import { LinkedInPostCard } from '@/components/social-cards/LinkedInPostCard'
import { XPostCard } from '@/components/social-cards/XPostCard'
import { ReviewPanel, channelDate, formatChannelDate } from '@/components/review/ReviewPanel'
import { ReviewIndicators } from '@/components/social-cards/ReviewIndicators'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_TABS: { slug: ChannelSlug; label: string }[] = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn'  },
  { slug: 'x',         label: 'X'         },
]

const VIEW_KEY = 'review-view'

type ApprovalFilter = 'all' | 'no-vote' | 'approved' | 'rejected'

const APPROVAL_FILTER_OPTIONS: { value: ApprovalFilter; label: string }[] = [
  { value: 'all',      label: 'Aprobación'     },
  { value: 'no-vote',  label: 'Sin mi voto'    },
  { value: 'approved', label: 'Aprobados por mí' },
  { value: 'rejected', label: 'Rechazados por mí' },
]

// ── Compact row ───────────────────────────────────────────────────────────────

function CompactRow({
  post, activeTab, selectedPostId, setSelectedPostId, userId, onVote,
}: {
  post:              ReviewPost
  activeTab:         ChannelSlug
  selectedPostId:    string | null
  setSelectedPostId: (id: string | null) => void
  userId:            string | null
  onVote:            (post: ReviewPost, decision: 'approved' | 'rejected') => Promise<void>
}) {
  const [voting, setVoting] = useState(false)

  const selected      = post.id === selectedPostId
  const toggle        = () => setSelectedPostId(selected ? null : post.id)
  const scheduledDate = channelDate(post, activeTab)
  const myVote        = (post.post_approvals ?? []).find((a) => a.user_id === userId)?.status ?? null
  const approvals     = post.post_approvals ?? []
  const comments      = post.post_comments  ?? []

  const pc      = post.post_channels.find((c) => c.channel?.slug === activeTab)
  const copy    = pc?.copy_override || post.copy
  const media   = post.media_files?.find((m) => m.type !== 'cover')
  const cover   = post.media_files?.find((m) => m.type === 'cover')
  const isVideo = media?.type === 'video' || /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(media?.url ?? '')

  async function handleVote(decision: 'approved' | 'rejected') {
    if (voting) return
    setVoting(true)
    try { await onVote(post, decision) } finally { setVoting(false) }
  }

  return (
    <article
      onClick={toggle}
      className={cn(
        'flex h-[72px] cursor-pointer items-center gap-3 px-4 transition-colors',
        selected ? 'bg-blue-50' : 'bg-white hover:bg-neutral-50',
      )}
    >
      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {cover ? (
          <img src={cover.url} alt="" className="h-full w-full object-cover" />
        ) : media && isVideo ? (
          <VideoThumbnail src={media.url} className="h-full w-full object-cover pointer-events-none" />
        ) : media ? (
          <img src={media.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-neutral-300" />
          </div>
        )}
      </div>

      {/* Copy + date */}
      <div className="min-w-0 flex-1">
        {copy ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-[#374151]">{copy}</p>
        ) : (
          <p className="text-[13px] italic text-neutral-400">Sin copy</p>
        )}
        <p className="mt-0.5 text-[11px] text-neutral-400">{formatChannelDate(scheduledDate)}</p>
      </div>

      {/* Indicators + vote buttons */}
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <ReviewIndicators approvals={approvals} comments={comments} />

        <button
          disabled={voting}
          onClick={() => handleVote('approved')}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50',
            myVote === 'approved'
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
          )}
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <button
          disabled={voting}
          onClick={() => handleVote('rejected')}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50',
            myVote === 'rejected'
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-600 hover:bg-red-100',
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </article>
  )
}

// ── Card wrapper (picks the right shared card per channel) ────────────────────

function Card({
  post, activeTab, selectedPostId, setSelectedPostId, userId, onVote,
}: {
  post:              ReviewPost
  activeTab:         ChannelSlug
  selectedPostId:    string | null
  setSelectedPostId: (id: string | null) => void
  userId:            string | null
  onVote:            (post: ReviewPost, decision: 'approved' | 'rejected') => Promise<void>
}) {
  const selected      = post.id === selectedPostId
  const toggle        = () => setSelectedPostId(selected ? null : post.id)
  const scheduledDate = channelDate(post, activeTab)
  const myVote        = (post.post_approvals ?? []).find((a) => a.user_id === userId)?.status ?? null
  const handleVote    = (decision: 'approved' | 'rejected') => onVote(post, decision)
  const approvals     = post.post_approvals ?? []
  const comments      = post.post_comments  ?? []

  if (activeTab === 'instagram') {
    return <InstagramPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} approvals={approvals} comments={comments} />
  }
  if (activeTab === 'linkedin') {
    return <LinkedInPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} approvals={approvals} comments={comments} />
  }
  return <XPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} approvals={approvals} comments={comments} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [posts,          setPosts]          = useState<ReviewPost[]>([])
  const [loading,        setLoading]        = useState(true)
  const [userId,         setUserId]         = useState<string | null>(null)
  const [userName,       setUserName]       = useState<string>('')
  const [activeTab,      setActiveTab]      = useState<ChannelSlug>('instagram')
  const [viewMode,        setViewMode]        = useState<'single' | 'grid' | 'compact'>('grid')
  const [selectedPostId,  setSelectedPostId]  = useState<string | null>(null)
  const [approvalFilter,  setApprovalFilter]  = useState<ApprovalFilter>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel on click-outside, but let card clicks switch the selection
  useEffect(() => {
    if (!selectedPostId) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element
      if (panelRef.current?.contains(target)) return  // inside panel
      if (target.closest('article')) return            // inside a card
      setSelectedPostId(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [selectedPostId])

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'single' || saved === 'grid' || saved === 'compact') setViewMode(saved)
  }, [])

  function toggleView(mode: 'single' | 'grid' | 'compact') {
    setViewMode(mode)
    localStorage.setItem(VIEW_KEY, mode)
  }

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

  const filteredPosts = posts
    .filter((p) => p.post_channels.some((pc) => pc.channel?.slug === activeTab))
    .filter((p) => {
      if (approvalFilter === 'all' || !userId) return true
      const myVote = (p.post_approvals ?? []).find((a) => a.user_id === userId)?.status ?? null
      if (approvalFilter === 'no-vote')  return myVote === null
      if (approvalFilter === 'approved') return myVote === 'approved'
      if (approvalFilter === 'rejected') return myVote === 'rejected'
      return true
    })
    .sort((a, b) => {
      const da = channelDate(a, activeTab)
      const db = channelDate(b, activeTab)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return new Date(da).getTime() - new Date(db).getTime()
    })

  const selectedPost = filteredPosts.find((p) => p.id === selectedPostId) ?? null
  const panelOpen    = selectedPost !== null

  function countFor(slug: ChannelSlug) {
    return posts.filter((p) => p.post_channels.some((pc) => pc.channel?.slug === slug)).length
  }

  function handleApprovalChange(postId: string, approvals: PostApproval[]) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, post_approvals: approvals } : p))
  }

  async function handleCardVote(post: ReviewPost, decision: 'approved' | 'rejected') {
    if (!userId) return
    const approvals  = post.post_approvals ?? []
    const myApproval = approvals.find((a) => a.user_id === userId)?.status ?? null
    if (myApproval === decision) {
      await deleteApproval(post.id, userId)
      handleApprovalChange(post.id, approvals.filter((a) => a.user_id !== userId))
    } else {
      await upsertApproval(post.id, userId, decision, null)
      const existing = approvals.find((a) => a.user_id === userId)
      const next = existing
        ? approvals.map((a) => (a.user_id === userId ? { ...a, status: decision } : a))
        : [
            ...approvals,
            {
              id:            `opt-${Date.now()}`,
              post_id:       post.id,
              user_id:       userId,
              status:        decision,
              comment:       null,
              created_at:    new Date().toISOString(),
              user_profiles: { full_name: userName, email: null },
            },
          ]
      handleApprovalChange(post.id, next)
    }
  }

  function handleCommentAdded(postId: string, comment: PostComment) {
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, post_comments: [...(p.post_comments ?? []), comment] } : p)
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-black text-[#0A0A0A]">Revisar contenido</h1>
          {!loading && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              {filteredPosts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Approval filter dropdown */}
          <div className="relative">
            <select
              value={approvalFilter}
              onChange={(e) => { setApprovalFilter(e.target.value as ApprovalFilter); setSelectedPostId(null) }}
              className="appearance-none cursor-pointer rounded-lg border border-[#E5E5E5] bg-neutral-50 py-1.5 pl-3 pr-7 text-[12px] text-neutral-500 outline-none transition-colors hover:border-neutral-300"
              style={approvalFilter !== 'all' ? { color: '#0A0A0A', fontWeight: 500, background: 'white' } : {}}
            >
              {APPROVAL_FILTER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-neutral-50 p-0.5">
            {([['single', LayoutList], ['grid', LayoutGrid], ['compact', AlignJustify]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => toggleView(mode)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-all',
                  viewMode === mode ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-neutral-400 hover:text-neutral-600',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Channel tabs ── */}
      <div className="flex shrink-0 justify-center border-b border-[#E5E5E5]">
        {CHANNEL_TABS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => { setActiveTab(slug); setSelectedPostId(null) }}
            className={cn(
              '-mb-px flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-[15px] font-medium transition-colors',
              activeTab === slug
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            <ChannelIcon slug={slug} size={20} gray={activeTab !== slug} />
            {label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              activeTab === slug ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-100 text-neutral-400',
            )}>
              {countFor(slug)}
            </span>
          </button>
        ))}
      </div>

      {/* ── Cards + Panel ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Scrollable cards area */}
        <div className={cn(
          'h-full overflow-y-auto px-6 py-5 transition-[padding] duration-300',
          panelOpen ? 'pr-[400px]' : 'pr-6',
        )}>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 className="h-8 w-8 text-neutral-200" />
              <div>
                <p className="text-[13.5px] font-medium text-neutral-700">Todo al día</p>
                <p className="mt-0.5 text-[12.5px] text-neutral-400">
                  No hay posts programados para revisar en este canal
                </p>
              </div>
            </div>
          ) : viewMode === 'compact' ? (
            <div className="overflow-hidden rounded-xl border border-[#E5E5E5] divide-y divide-[#F0F0F0]">
              {filteredPosts.map((post) => (
                <CompactRow
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  selectedPostId={selectedPostId}
                  setSelectedPostId={setSelectedPostId}
                  userId={userId}
                  onVote={handleCardVote}
                />
              ))}
            </div>
          ) : viewMode === 'single' ? (
            <div className={cn(
              'mx-auto flex flex-col gap-5',
              activeTab === 'instagram' ? 'max-w-[420px]' : 'max-w-[500px]',
            )}>
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  selectedPostId={selectedPostId}
                  setSelectedPostId={setSelectedPostId}
                  userId={userId}
                  onVote={handleCardVote}
                />
              ))}
            </div>
          ) : (
            <div className={cn(
              'grid gap-4',
              activeTab === 'instagram'
                ? 'grid-cols-3 max-w-[1020px] mx-auto [&>*]:max-w-[320px] [&>*]:mx-auto [&>*]:w-full'
                : 'grid-cols-3',
            )}>
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  selectedPostId={selectedPostId}
                  setSelectedPostId={setSelectedPostId}
                  userId={userId}
                  onVote={handleCardVote}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sliding panel */}
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 top-0 h-full w-[380px] border-l border-[#E5E5E5] bg-white shadow-[-6px_0_30px_rgba(0,0,0,0.08)] transition-transform duration-300',
            panelOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          {selectedPost && (
            <ReviewPanel
              post={selectedPost}
              userId={userId ?? ''}
              userName={userName}
              activeChannel={activeTab}
              onClose={() => setSelectedPostId(null)}
              onApprovalChange={handleApprovalChange}
              onCommentAdded={handleCommentAdded}
            />
          )}
        </div>
      </div>
    </div>
  )
}
