'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Loader2, X, Send, LayoutList, LayoutGrid,
  CheckCircle, XCircle, CheckCircle2, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPosts } from '@/lib/api/posts'
import { upsertApproval, deleteApproval, createComment } from '@/lib/api/profiles'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { InstagramPostCard } from '@/components/social-cards/InstagramPostCard'
import { LinkedInPostCard } from '@/components/social-cards/LinkedInPostCard'
import { XPostCard } from '@/components/social-cards/XPostCard'

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_TABS: { slug: ChannelSlug; label: string }[] = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn'  },
  { slug: 'x',         label: 'X'         },
]

const VIEW_KEY = 'review-view'

// ── Helpers ────────────────────────────────────────────────────────────────────

function channelDate(post: ReviewPost, slug: ChannelSlug): string | null {
  const pc = post.post_channels.find((c) => c.channel?.slug === slug)
  return pc?.scheduled_at ?? post.scheduled_at ?? null
}

function formatChannelDate(date: string | null): string {
  if (!date) return 'Sin fecha programada'
  const d   = new Date(date)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(format(d, 'EEEE', { locale: es }))} ${format(d, 'd')} de ${cap(format(d, 'MMMM', { locale: es }))}`
}

// Extract Google Drive file ID from any Drive URL format
function driveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([^/?#]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([^&#]+)/)
  if (m2) return m2[1]
  return null
}

// Panel media — Drive iframe, Supabase <video>, or image
function PanelMedia({ post, activeChannel }: { post: ReviewPost; activeChannel: ChannelSlug }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')

  // Google Drive video
  const extUrl = post.external_media_url ?? ''
  if (extUrl.includes('drive.google.com')) {
    const fileId = driveFileId(extUrl)
    if (fileId) {
      return (
        <div className="w-full overflow-hidden bg-black" style={{ aspectRatio: '4/5' }}>
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            width="100%"
            height="100%"
            allow="autoplay"
            className="border-0"
          />
        </div>
      )
    }
  }

  // Supabase video
  if (main?.type === 'video') {
    return (
      <div className="w-full overflow-hidden bg-black" style={{ aspectRatio: '4/5' }}>
        <video
          src={main.url}
          controls
          poster={cover?.url}
          className="h-full w-full object-contain"
        />
      </div>
    )
  }

  // Image
  const src = main?.url ?? cover?.url
  if (!src) return null
  if (activeChannel === 'linkedin') {
    return (
      <div className="w-full bg-[#f0f0f0]">
        <img src={src} alt="" className="w-full h-auto object-contain block" />
      </div>
    )
  }
  return (
    <div className="w-full overflow-hidden" style={{ aspectRatio: '4/5' }}>
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  )
}

// ── Review Panel ──────────────────────────────────────────────────────────────

interface PanelProps {
  post:             ReviewPost
  userId:           string
  userName:         string
  activeChannel:    ChannelSlug
  onClose:          () => void
  onApprovalChange: (postId: string, approvals: PostApproval[]) => void
  onCommentAdded:   (postId: string, comment: PostComment) => void
}

function ReviewPanel({ post, userId, userName, activeChannel, onClose, onApprovalChange, onCommentAdded }: PanelProps) {
  const [commentText,    setCommentText]    = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [sendingComment, setSendingComment] = useState(false)

  useEffect(() => { setCommentText('') }, [post.id])

  const approvals  = post.post_approvals ?? []
  const myApproval = approvals.find((a) => a.user_id === userId)?.status ?? null
  const approved   = approvals.filter((a) => a.status === 'approved')
  const rejected   = approvals.filter((a) => a.status === 'rejected')
  const comments   = [...(post.post_comments ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  function name(a: PostApproval) {
    return a.user_profiles?.full_name || a.user_profiles?.email || 'Reviewer'
  }

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (submitting) return
    setSubmitting(true)
    try {
      if (myApproval === decision) {
        // Toggle off: remove the vote
        await deleteApproval(post.id, userId)
        onApprovalChange(post.id, approvals.filter((a) => a.user_id !== userId))
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
                status:        decision as 'approved' | 'rejected',
                comment:       null,
                created_at:    new Date().toISOString(),
                user_profiles: { full_name: userName, email: null },
              },
            ]
        onApprovalChange(post.id, next)
      }
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
      onCommentAdded(post.id, created)
      setCommentText('')
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#E5E5E5] px-5 py-4">
        <p className="flex-1 truncate text-[13.5px] font-semibold text-neutral-900">
          {formatChannelDate(channelDate(post, activeChannel))}
        </p>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0F0]">

        {/* Media preview */}
        <PanelMedia post={post} activeChannel={activeChannel} />

        {/* Revisión */}
        <div className="px-5 py-5">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
            Revisión
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleDecision('approved')}
              disabled={submitting}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all',
                myApproval === 'approved'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              )}
            >
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle className="h-4 w-4" />
              }
              Aprobar
            </button>
            <button
              onClick={() => handleDecision('rejected')}
              disabled={submitting}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all',
                myApproval === 'rejected'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
              )}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        </div>

        {/* Votos */}
        <div className="px-5 py-5">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
            Votos ({approvals.length})
          </p>
          {approvals.length === 0 ? (
            <p className="text-[12.5px] text-neutral-400">Sin votos aún</p>
          ) : (
            <div className="space-y-2.5">
              {approved.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-[13px] text-neutral-700">{name(a)}</span>
                </div>
              ))}
              {rejected.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <XCircle className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-[13px] text-neutral-700">{name(a)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comentarios */}
        <div className="px-5 py-5">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
            Comentarios ({comments.length})
          </p>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleComment() }}
              placeholder="Agregar comentario…"
              className="flex-1 rounded-lg border border-[#E5E5E5] bg-neutral-50 px-3 py-2 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || sendingComment}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
            >
              {sendingComment
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="text-[12.5px] text-neutral-400">Sin comentarios aún</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-neutral-800">
                      {c.user_profiles?.full_name || c.user_profiles?.email || 'Reviewer'}
                    </span>
                    <span className="shrink-0 text-[11px] text-neutral-400">
                      {format(new Date(c.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-neutral-600">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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

  if (activeTab === 'instagram') {
    return <InstagramPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} />
  }
  if (activeTab === 'linkedin') {
    return <LinkedInPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} />
  }
  return <XPostCard post={post} onClick={toggle} selected={selected} scheduledDate={scheduledDate} myVote={myVote} onVote={handleVote} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [posts,          setPosts]          = useState<ReviewPost[]>([])
  const [loading,        setLoading]        = useState(true)
  const [userId,         setUserId]         = useState<string | null>(null)
  const [userName,       setUserName]       = useState<string>('')
  const [activeTab,      setActiveTab]      = useState<ChannelSlug>('instagram')
  const [viewMode,       setViewMode]       = useState<'single' | 'grid'>('grid')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'single' || saved === 'grid') setViewMode(saved)
  }, [])

  function toggleView(mode: 'single' | 'grid') {
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
        <div className="flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-neutral-50 p-0.5">
          {([['single', LayoutList], ['grid', LayoutGrid]] as const).map(([mode, Icon]) => (
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
        <div className={cn(
          'absolute right-0 top-0 h-full w-[380px] border-l border-[#E5E5E5] bg-white shadow-[-6px_0_30px_rgba(0,0,0,0.08)] transition-transform duration-300',
          panelOpen ? 'translate-x-0' : 'translate-x-full',
        )}>
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
