'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Loader2, CheckCircle, XCircle, Send, ImageIcon,
  LayoutList, LayoutGrid, MessageSquare, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPosts } from '@/lib/api/posts'
import { upsertApproval, createComment } from '@/lib/api/profiles'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNEL_TABS: { slug: ChannelSlug; label: string }[] = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn'  },
  { slug: 'x',        label: 'X'         },
]

const VIEW_STORAGE_KEY = 'review-view'

// ── Sub-components ────────────────────────────────────────────────────────────

function PostMedia({ post, tall }: { post: ReviewPost; tall: boolean }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const h = tall ? 'h-72' : 'h-48'

  if (main?.type === 'video') {
    return (
      <div className={cn('relative w-full bg-neutral-100 overflow-hidden', h)}>
        {cover
          ? <img src={cover.url} alt={post.title} className="h-full w-full object-cover" />
          : <VideoThumbnail src={main.url} className="h-full w-full object-cover pointer-events-none" />
        }
      </div>
    )
  }
  if (main?.type === 'image') {
    return (
      <div className={cn('relative w-full bg-neutral-100 overflow-hidden', h)}>
        <img src={main.url} alt={post.title} className="h-full w-full object-cover" />
      </div>
    )
  }
  if (cover) {
    return (
      <div className={cn('relative w-full bg-neutral-100 overflow-hidden', h)}>
        <img src={cover.url} alt={post.title} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={cn('flex w-full items-center justify-center bg-neutral-100', h)}>
      <ImageIcon className="h-8 w-8 text-neutral-200" />
    </div>
  )
}

function VotesList({ approvals }: { approvals: PostApproval[] }) {
  if (approvals.length === 0) return null

  const approved = approvals.filter((a) => a.status === 'approved')
  const rejected = approvals.filter((a) => a.status === 'rejected')

  function name(a: PostApproval) {
    return a.user_profiles?.full_name || a.user_profiles?.email || 'Reviewer'
  }

  return (
    <div className="space-y-1.5 rounded-lg bg-neutral-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Votos ({approvals.length})
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {approved.map((a) => (
          <span key={a.id} className="flex items-center gap-1 text-[12px] text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {name(a)}
          </span>
        ))}
        {rejected.map((a) => (
          <span key={a.id} className="flex items-center gap-1 text-[12px] text-red-600">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {name(a)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

interface ReviewCardProps {
  post:          ReviewPost
  userId:        string
  userName:      string
  activeChannel: ChannelSlug
  single:        boolean
}

function ReviewCard({ post, userId, userName, activeChannel, single }: ReviewCardProps) {
  const [approvals,      setApprovals]      = useState<PostApproval[]>(post.post_approvals ?? [])
  const [comments,       setComments]       = useState<PostComment[]>(
    [...(post.post_comments ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [commentText,    setCommentText]    = useState('')
  const [showComments,   setShowComments]   = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [sendingComment, setSendingComment] = useState(false)

  const myApproval    = approvals.find((a) => a.user_id === userId)?.status ?? null
  const channelEntry  = post.post_channels.find((pc) => pc.channel?.slug === activeChannel)
  const channelDate   = channelEntry?.scheduled_at

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (submitting) return
    setSubmitting(true)
    try {
      await upsertApproval(post.id, userId, decision, null)
      setApprovals((prev) => {
        const existing = prev.find((a) => a.user_id === userId)
        if (existing) {
          return prev.map((a) =>
            a.user_id === userId ? { ...a, status: decision } : a
          )
        }
        return [
          ...prev,
          {
            id:           `opt-${Date.now()}`,
            post_id:      post.id,
            user_id:      userId,
            status:       decision,
            comment:      null,
            created_at:   new Date().toISOString(),
            user_profiles: { full_name: userName, email: null },
          },
        ]
      })
    } catch {
      // silent — UI will stay consistent with last successful state
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComment() {
    const text = commentText.trim()
    if (!text || sendingComment) return
    setSendingComment(true)
    try {
      const created = await createComment(post.id, userId, text)
      setComments((prev) => [...prev, created])
      setCommentText('')
      setShowComments(true)
    } catch {
      // silent
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Media */}
      <PostMedia post={post} tall={single} />

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">

        {/* Channel + date */}
        <div className="flex items-center gap-2">
          <ChannelIcon slug={activeChannel} size={15} />
          {channelDate ? (
            <span className="text-[12px] text-neutral-500">
              {format(new Date(channelDate), 'dd MMM yyyy · HH:mm')}
            </span>
          ) : (
            <span className="text-[12px] text-neutral-400">Sin fecha</span>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <p className="text-[13.5px] font-semibold text-neutral-900">{post.title}</p>
        )}

        {/* Copy — full, no truncation */}
        {post.copy && (
          <p className="text-[13px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {post.copy}
          </p>
        )}

        {/* Votes */}
        <VotesList approvals={approvals} />

        {/* Approve / Reject */}
        <div className="flex gap-2">
          <button
            onClick={() => handleDecision('approved')}
            disabled={submitting}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all',
              myApproval === 'approved'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            )}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Aprobar
          </button>
          <button
            onClick={() => handleDecision('rejected')}
            disabled={submitting}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all',
              myApproval === 'rejected'
                ? 'bg-red-500 text-white shadow-sm'
                : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>

        {/* Comment input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleComment() }}
            placeholder="Agregar comentario…"
            className="flex-1 rounded-lg border border-[#E5E5E5] bg-neutral-50 px-3 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
          />
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || sendingComment}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            {sendingComment
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>

        {/* Comments toggle + list */}
        {comments.length > 0 && (
          <div>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-[11.5px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
            </button>

            {showComments && (
              <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 p-3">
                {comments.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-semibold text-neutral-700">
                        {c.user_profiles?.full_name || c.user_profiles?.email || 'Reviewer'}
                      </span>
                      <span className="text-[10.5px] text-neutral-400">
                        {format(new Date(c.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-neutral-600">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [posts,     setPosts]     = useState<ReviewPost[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [userName,  setUserName]  = useState<string>('')
  const [activeTab, setActiveTab] = useState<ChannelSlug>('instagram')
  const [viewMode,  setViewMode]  = useState<'single' | 'grid'>('grid')

  // Restore view preference
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === 'single' || saved === 'grid') setViewMode(saved)
  }, [])

  function toggleView(mode: 'single' | 'grid') {
    setViewMode(mode)
    localStorage.setItem(VIEW_STORAGE_KEY, mode)
  }

  // Load current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setUserId(user.id)
        setUserName(
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email ??
          'Reviewer'
        )
      }
    })
  }, [])

  // Load posts
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchReviewPosts()
        setPosts(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter + sort by active channel
  const filteredPosts = posts
    .filter((p) => p.post_channels.some((pc) => pc.channel?.slug === activeTab))
    .sort((a, b) => {
      const dateA = a.post_channels.find((pc) => pc.channel?.slug === activeTab)?.scheduled_at
      const dateB = b.post_channels.find((pc) => pc.channel?.slug === activeTab)?.scheduled_at
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

  function countForChannel(slug: ChannelSlug) {
    return posts.filter((p) => p.post_channels.some((pc) => pc.channel?.slug === slug)).length
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-black text-[#0A0A0A]">Revisar contenido</h1>
          {!loading && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              {filteredPosts.length}
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-neutral-50 p-0.5">
          <button
            onClick={() => toggleView('single')}
            title="Vista de columna"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-all',
              viewMode === 'single'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-neutral-400 hover:text-neutral-600',
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleView('grid')}
            title="Vista de grilla"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-all',
              viewMode === 'grid'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-neutral-400 hover:text-neutral-600',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex shrink-0 border-b border-[#E5E5E5] px-6">
        {CHANNEL_TABS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => setActiveTab(slug)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors -mb-px',
              activeTab === slug
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            <ChannelIcon slug={slug} size={14} gray={activeTab !== slug} />
            {label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              activeTab === slug
                ? 'bg-neutral-100 text-neutral-600'
                : 'bg-neutral-100 text-neutral-400',
            )}>
              {countForChannel(slug)}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
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
        ) : viewMode === 'single' ? (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {filteredPosts.map((post) => (
              <ReviewCard
                key={post.id}
                post={post}
                userId={userId ?? ''}
                userName={userName}
                activeChannel={activeTab}
                single
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <ReviewCard
                key={post.id}
                post={post}
                userId={userId ?? ''}
                userName={userName}
                activeChannel={activeTab}
                single={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
