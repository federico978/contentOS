'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, CheckCircle, XCircle, MessageSquare, ImageIcon, Play, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchPosts } from '@/lib/api/posts'
import { upsertApproval, createComment, getApprovals, getComments } from '@/lib/api/profiles'
import { PostWithDetails, PostApproval, PostComment, ChannelSlug } from '@/lib/types'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { VideoThumbnail } from '@/components/feed/VideoThumbnail'

function PostThumbnail({ post }: { post: PostWithDetails }) {
  const media     = post.media_files?.find((m) => m.type !== 'cover')
  const coverMedia = post.media_files?.find((m) => m.type === 'cover')

  if (media?.type === 'video') {
    return coverMedia
      ? <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
      : <VideoThumbnail src={media.url} className="h-full w-full object-cover pointer-events-none" />
  }
  if (media?.type === 'image') {
    return <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
  }
  if (coverMedia) {
    return <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ImageIcon className="h-7 w-7 text-neutral-200" />
    </div>
  )
}

function ReviewCard({ post, userId }: { post: PostWithDetails; userId: string }) {
  const [approvals,    setApprovals]    = useState<PostApproval[]>([])
  const [comments,     setComments]     = useState<PostComment[]>([])
  const [myApproval,   setMyApproval]   = useState<'approved' | 'rejected' | null>(null)
  const [commentText,  setCommentText]  = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [sendingComment, setSendingComment] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [a, c] = await Promise.all([getApprovals(post.id), getComments(post.id)])
        setApprovals(a)
        setComments(c)
        const mine = a.find((ap) => ap.user_id === userId)
        if (mine) setMyApproval(mine.status)
      } catch {
        // Tables might not exist yet — ignore
      }
    }
    load()
  }, [post.id, userId])

  async function handleDecision(decision: 'approved' | 'rejected') {
    setSubmitting(true)
    try {
      await upsertApproval(post.id, userId, decision, null)
      setMyApproval(decision)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComment() {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const newComment = await createComment(post.id, userId, commentText.trim())
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } finally {
      setSendingComment(false)
    }
  }

  const date = post.post_channels[0]?.scheduled_at ?? post.scheduled_at

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Thumbnail */}
      <div className="relative h-44 bg-neutral-100">
        <PostThumbnail post={post} />
        {/* Approval status overlay */}
        {myApproval && (
          <div className={`absolute inset-0 flex items-center justify-center bg-black/20`}>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white ${myApproval === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {myApproval === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {myApproval === 'approved' ? 'Aprobado' : 'Rechazado'}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <h3 className="text-[13px] font-semibold leading-snug text-neutral-900 line-clamp-1">
            {post.title || 'Sin título'}
          </h3>
          {post.copy && (
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 line-clamp-3">
              {post.copy}
            </p>
          )}
        </div>

        {/* Meta: channels + date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {post.post_channels.map((pc) => pc.channel?.slug && (
              <ChannelIcon key={pc.id} slug={pc.channel.slug as ChannelSlug} size={14} />
            ))}
          </div>
          {date && (
            <span className="text-[11px] text-neutral-400">
              {format(new Date(date), 'dd MMM yyyy')}
            </span>
          )}
        </div>

        {/* Approve / Reject buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleDecision('approved')}
            disabled={submitting}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              myApproval === 'approved'
                ? 'bg-emerald-500 text-white'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Aprobar
          </button>
          <button
            onClick={() => handleDecision('rejected')}
            disabled={submitting}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              myApproval === 'rejected'
                ? 'bg-red-500 text-white'
                : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
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
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Comments toggle */}
        {comments.length > 0 && (
          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 text-[11.5px] text-neutral-400 hover:text-neutral-600"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
          </button>
        )}

        {showComments && comments.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-neutral-50 p-2.5">
            {comments.map((c) => (
              <div key={c.id} className="text-[11.5px]">
                <span className="font-medium text-neutral-700">
                  {c.user_profiles?.full_name || c.user_profiles?.email || 'Reviewer'}
                </span>
                <span className="ml-1.5 text-neutral-500">{c.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const [posts,   setPosts]   = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [userId,  setUserId]  = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const all = await fetchPosts()
        setPosts(all.filter((p) => p.status === 'scheduled'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-black text-[#0A0A0A]">Revisar contenido</h1>
          {!loading && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              {posts.length}
            </span>
          )}
        </div>
        <p className="text-[12px] text-neutral-400">Posts programados pendientes de revisión</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3 text-center">
            <CheckCircle className="h-8 w-8 text-neutral-200" />
            <div>
              <p className="text-[13.5px] font-medium text-neutral-700">Todo al día</p>
              <p className="mt-0.5 text-[12.5px] text-neutral-400">No hay posts programados para revisar</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {posts.map((post) => (
              <ReviewCard key={post.id} post={post} userId={userId ?? ''} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
