'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import {
  Loader2, X, Send, LayoutList, LayoutGrid,
  Heart, MessageCircle, Bookmark, Repeat2, ThumbsUp, BarChart2,
  CheckCircle, XCircle, CheckCircle2, MoreHorizontal, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchReviewPosts } from '@/lib/api/posts'
import { upsertApproval, createComment } from '@/lib/api/profiles'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_TABS: { slug: ChannelSlug; label: string }[] = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn'  },
  { slug: 'x',        label: 'X'         },
]

const VIEW_KEY = 'review-view'

// ── Helpers ────────────────────────────────────────────────────────────────────

function channelCopy(post: ReviewPost, slug: ChannelSlug) {
  return post.post_channels.find((c) => c.channel?.slug === slug)?.copy_override || post.copy || ''
}

function channelDate(post: ReviewPost, slug: ChannelSlug) {
  return post.post_channels.find((c) => c.channel?.slug === slug)?.scheduled_at ?? null
}

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g

function parseLinkedInText(text: string) {
  const parts = text.split(URL_RE)
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0 // reset stateful regex after test()
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0A66C2', fontWeight: 600 }}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

// First-frame extractor for Supabase videos (no cover image available)
function VideoFirstFrame({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    function seek() { if (v) v.currentTime = 0.1 }
    v.addEventListener('loadedmetadata', seek)
    if (v.readyState >= 1) seek()
    return () => v.removeEventListener('loadedmetadata', seek)
  }, [src])
  return (
    <video
      ref={ref}
      src={src}
      preload="metadata"
      muted
      playsInline
      className="h-full w-full object-cover"
      style={{ pointerEvents: 'none' }}
    />
  )
}

// Card thumbnail — always static; videos show cover (or first-frame) + play icon overlay
function PostMedia({ post }: { post: ReviewPost }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')

  if (main?.type === 'video') {
    return (
      <div className="relative h-full w-full">
        {cover
          ? <img src={cover.url} alt="" className="h-full w-full object-cover" />
          : <VideoFirstFrame src={main.url} />
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-5 w-5 fill-white text-white ml-0.5" />
          </div>
        </div>
      </div>
    )
  }

  const src = main?.url ?? cover?.url
  if (!src) return null
  return <img src={src} alt="" className="h-full w-full object-cover" />
}

// Extract Google Drive file ID from any Drive URL format
function driveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([^/?#]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([^&#]+)/)
  if (m2) return m2[1]
  return null
}

// Panel media — Drive iframe, Supabase <video>, or image — 4:5 ratio, above approval buttons
function PanelMedia({ post, activeChannel }: { post: ReviewPost; activeChannel: ChannelSlug }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')

  // ── Google Drive video (stored in external_media_url) ─────────────────────
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

  // ── Supabase video ────────────────────────────────────────────────────────
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

  // ── Image ─────────────────────────────────────────────────────────────────
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

function hasMedia(post: ReviewPost) {
  return (post.media_files?.length ?? 0) > 0
}

// ── Instagram Card ─────────────────────────────────────────────────────────────

function InstagramCard({
  post, selected, onClick,
}: { post: ReviewPost; selected: boolean; onClick: () => void }) {
  const copy = channelCopy(post, 'instagram')
  const date = channelDate(post, 'instagram')
  const commentCount = (post.post_comments ?? []).length

  return (
    <article
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#DBDBDB] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Story ring */}
          <div className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="rounded-full bg-white p-[2px]">
              <BigSurAvatar size={30} />
            </div>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold leading-none text-neutral-900">bigsur.energy</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-neutral-800" />
      </div>

      {/* Square image */}
      {hasMedia(post) && (
        <div className="w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: '4/5' }}>
          <PostMedia post={post} />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-4">
          <Heart className="h-[25px] w-[25px] text-neutral-900" strokeWidth={1.5} />
          <MessageCircle className="h-[25px] w-[25px] text-neutral-900" strokeWidth={1.5} />
          {/* Instagram share icon */}
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className="text-neutral-900" strokeWidth="1.5">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <Bookmark className="h-[25px] w-[25px] text-neutral-900" strokeWidth={1.5} />
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-[13px] font-semibold text-neutral-900">1.161 Me gusta</p>
      </div>

      {/* Caption */}
      {copy && (
        <div className="px-3 pb-1">
          <p className="text-[13px] leading-snug text-neutral-900">
            <span className="font-semibold">bigsur.energy</span>{' '}
            <span className="whitespace-pre-wrap">{copy}</span>
          </p>
        </div>
      )}

      {/* Comments + date */}
      <div className="px-3 pb-3 pt-0.5 space-y-0.5">
        {commentCount > 0 && (
          <p className="text-[13px] text-neutral-400">Ver los {commentCount} comentarios</p>
        )}
        {date && (
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">
            {format(new Date(date), 'dd MMM yyyy')}
          </p>
        )}
      </div>
    </article>
  )
}

// LinkedIn shows the full image without cropping — object-contain, height auto
function LinkedInMedia({ post }: { post: ReviewPost }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')
  const src   = main?.url ?? cover?.url
  if (!src) return null
  return <img src={src} alt="" className="w-full h-auto object-contain block" />
}

// ── LinkedIn Card ──────────────────────────────────────────────────────────────

function LinkedInCard({
  post, selected, onClick,
}: { post: ReviewPost; selected: boolean; onClick: () => void }) {
  const copy = channelCopy(post, 'linkedin')
  const date = channelDate(post, 'linkedin')

  return (
    <article
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#E0E0E0] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="shrink-0 overflow-hidden rounded-full border border-[#E0E0E0]">
          <BigSurAvatar size={48} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-semibold leading-tight text-neutral-900">BigSur Energy</p>
          <p className="text-[12.5px] leading-tight text-neutral-500">Energy Infrastructure</p>
          <div className="mt-0.5 flex items-center gap-1 text-neutral-400">
            <span className="text-[12px]">{date ? format(new Date(date), 'dd MMM') : '—'}</span>
            <span className="text-[12px]">·</span>
            {/* Globe icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
        </div>
        <ChannelIcon slug="linkedin" size={20} />
      </div>

      {/* Copy — URLs rendered as LinkedIn-style links */}
      {copy && (
        <p className="px-4 pb-3 text-[14px] leading-relaxed text-neutral-900 whitespace-pre-wrap">
          {parseLinkedInText(copy)}
        </p>
      )}

      {/* Image — full width, natural height, no crop */}
      {hasMedia(post) && (
        <div className="w-full bg-[#f0f0f0] border-t border-[#E0E0E0]">
          <LinkedInMedia post={post} />
        </div>
      )}

      {/* Social proof */}
      <div className="flex items-center justify-between border-t border-[#E8E8E8] px-4 py-1.5">
        <span className="text-[12px] text-neutral-500">👍 ❤️ 247</span>
        <span className="text-[12px] text-neutral-500">18 comentarios</span>
      </div>

      {/* Action bar */}
      <div className="flex items-center border-t border-[#E8E8E8]">
        {[
          { icon: ThumbsUp,       label: 'Me gusta'  },
          { icon: MessageCircle,  label: 'Comentar'  },
          { icon: Repeat2,        label: 'Compartir' },
          { icon: Send,           label: 'Enviar'    },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-neutral-500"
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.5} />
            <span className="text-[12px] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

// ── X Card ────────────────────────────────────────────────────────────────────

function XCard({
  post, selected, onClick,
}: { post: ReviewPost; selected: boolean; onClick: () => void }) {
  const copy = channelCopy(post, 'x')
  const date = channelDate(post, 'x')

  return (
    <article
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden rounded-2xl bg-white border transition-all duration-200',
        selected
          ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
          : 'border-[#EFF3F4] shadow-sm hover:shadow-md hover:border-neutral-300',
      )}
    >
      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 overflow-hidden rounded-full">
              <BigSurAvatar size={42} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-bold text-neutral-900">BigSur Energy</span>
                {/* X verified badge */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#1D9BF0"/>
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-1 text-neutral-500 text-[14px]">
                <span>@bigsur_energy</span>
                <span>·</span>
                <span>{date ? format(new Date(date), 'd MMM') : '—'}</span>
              </div>
            </div>
          </div>
          <ChannelIcon slug="x" size={20} />
        </div>

        {/* Copy */}
        {copy && (
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-900 whitespace-pre-wrap">
            {copy}
          </p>
        )}

        {/* Image */}
        {hasMedia(post) && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-[#EFF3F4] bg-neutral-100">
            <PostMedia post={post} />
          </div>
        )}

        {/* Action bar */}
        <div className="mt-3 flex items-center justify-between text-neutral-500">
          {[
            { icon: MessageCircle, count: '8'   },
            { icon: Repeat2,       count: '12'  },
            { icon: Heart,         count: '94'  },
            { icon: BarChart2,     count: '4.2K' },
            { icon: Bookmark,      count: null  },
          ].map(({ icon: Icon, count }, i) => (
            <div key={i} className="flex items-center gap-1">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.5} />
              {count && <span className="text-[13px]">{count}</span>}
            </div>
          ))}
        </div>
      </div>
    </article>
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

  const approvals    = post.post_approvals ?? []
  const myApproval   = approvals.find((a) => a.user_id === userId)?.status ?? null
  const approved     = approvals.filter((a) => a.status === 'approved')
  const rejected     = approvals.filter((a) => a.status === 'rejected')
  const comments     = [...(post.post_comments ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  function name(a: PostApproval) {
    return a.user_profiles?.full_name || a.user_profiles?.email || 'Reviewer'
  }

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (submitting) return
    setSubmitting(true)
    try {
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
          {post.title || 'Post sin título'}
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

          {/* Input */}
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

          {/* List */}
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

// ── Card renderer (picks the right card component per channel) ─────────────────

function Card({
  post, activeTab, selectedPostId, setSelectedPostId,
}: {
  post:             ReviewPost
  activeTab:        ChannelSlug
  selectedPostId:   string | null
  setSelectedPostId: (id: string | null) => void
}) {
  const selected = post.id === selectedPostId
  const toggle   = () => setSelectedPostId(selected ? null : post.id)

  if (activeTab === 'instagram') return <InstagramCard post={post} selected={selected} onClick={toggle} />
  if (activeTab === 'linkedin')  return <LinkedInCard  post={post} selected={selected} onClick={toggle} />
  return <XCard post={post} selected={selected} onClick={toggle} />
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
      const da = a.post_channels.find((pc) => pc.channel?.slug === activeTab)?.scheduled_at
      const db = b.post_channels.find((pc) => pc.channel?.slug === activeTab)?.scheduled_at
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
      <div className="flex shrink-0 border-b border-[#E5E5E5] px-6">
        {CHANNEL_TABS.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => { setActiveTab(slug); setSelectedPostId(null) }}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors',
              activeTab === slug
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            <ChannelIcon slug={slug} size={14} gray={activeTab !== slug} />
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

        {/* Scrollable cards area — shrinks when panel is open */}
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
            <div className="mx-auto flex max-w-[500px] flex-col gap-5">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  selectedPostId={selectedPostId}
                  setSelectedPostId={setSelectedPostId}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  selectedPostId={selectedPostId}
                  setSelectedPostId={setSelectedPostId}
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
