'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toArDate } from '@/lib/dates'
import { Loader2, X, Send, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { upsertApproval, deleteApproval, createComment, updateComment, deleteComment } from '@/lib/api/profiles'
import { ReviewPost, PostApproval, PostComment, ChannelSlug } from '@/lib/types'

// ── Exported helpers ──────────────────────────────────────────────────────────

export function channelDate(post: ReviewPost, slug: ChannelSlug): string | null {
  const pc = post.post_channels.find((c) => c.channel?.slug === slug)
  return pc?.scheduled_at ?? post.scheduled_at ?? null
}

export function formatChannelDate(date: string | null): string {
  if (!date) return 'Sin fecha programada'
  const d   = toArDate(date)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(format(d, 'EEEE', { locale: es }))} ${format(d, 'd')} de ${cap(format(d, 'MMMM', { locale: es }))}`
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function driveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([^/?#]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([^&#]+)/)
  if (m2) return m2[1]
  return null
}

function PanelMedia({ post, activeChannel }: { post: ReviewPost; activeChannel: ChannelSlug }) {
  const main  = post.media_files?.find((m) => m.type !== 'cover')
  const cover = post.media_files?.find((m) => m.type === 'cover')

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

  const src = main?.url ?? cover?.url
  if (!src) return null
  if (activeChannel === 'linkedin') {
    return (
      <div className="w-full bg-[#f0f0f0]">
        <img src={src} alt="" className="w-full h-auto object-contain block" />
      </div>
    )
  }
  if (activeChannel === 'x') {
    return (
      <div className="w-full bg-black">
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

// ── ReviewPanel ───────────────────────────────────────────────────────────────

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  isOwn,
  onUpdate,
  onDelete,
}: {
  comment:  PostComment
  isOwn:    boolean
  onUpdate: (id: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [hovered,       setHovered]       = useState(false)
  const [editing,       setEditing]       = useState(false)
  const [editText,      setEditText]      = useState(comment.content)
  const [saving,        setSaving]        = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at

  async function handleSave() {
    const text = editText.trim()
    if (!text) return
    setSaving(true)
    try {
      await onUpdate(comment.id, text)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditText(comment.content)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Header row */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-neutral-800">
          {comment.user_profiles?.full_name || comment.user_profiles?.email || 'Reviewer'}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isEdited && (
            <span className="text-[10.5px] text-neutral-400">(editado)</span>
          )}
          <span className="text-[11px] text-neutral-400">
            {format(toArDate(comment.created_at), 'dd/MM HH:mm')}
          </span>
          {isOwn && hovered && !editing && !confirmDelete && (
            <>
              <button
                onClick={() => { setEditing(true); setEditText(comment.content) }}
                className="text-[#9CA3AF] transition-colors hover:text-neutral-600"
                title="Editar"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[#9CA3AF] transition-colors hover:text-neutral-600"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="mt-1">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-neutral-50 px-3 py-2 text-[12.5px] text-neutral-800 focus:border-neutral-300 focus:outline-none"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              className="rounded-md bg-neutral-900 px-2.5 py-1 text-[11.5px] font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded-md border border-[#E5E5E5] px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : confirmDelete ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[12px] text-neutral-600">¿Eliminar este comentario?</span>
          <button
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="rounded-md bg-red-500 px-2 py-0.5 text-[11.5px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? '…' : 'Sí'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md border border-[#E5E5E5] px-2 py-0.5 text-[11.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            No
          </button>
        </div>
      ) : (
        <p className="mt-0.5 text-[12.5px] leading-snug text-neutral-600">{comment.content}</p>
      )}
    </div>
  )
}

// ── ReviewPanel ───────────────────────────────────────────────────────────────

export interface ReviewPanelProps {
  post:              ReviewPost
  userId:            string
  userName:          string
  activeChannel:     ChannelSlug
  onClose:           () => void
  onApprovalChange:  (postId: string, approvals: PostApproval[]) => void
  onCommentAdded:    (postId: string, comment: PostComment) => void
  onCommentUpdated?: (postId: string, comment: PostComment) => void
  onCommentDeleted?: (postId: string, commentId: string) => void
}

export function ReviewPanel({
  post, userId, userName, activeChannel, onClose,
  onApprovalChange, onCommentAdded, onCommentUpdated, onCommentDeleted,
}: ReviewPanelProps) {
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
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
              )}
            >
              <XCircle className="h-4 w-4" />
              Solicitar cambios
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
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <XCircle className="h-3 w-3 text-orange-600" />
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
                <CommentItem
                  key={c.id}
                  comment={c}
                  isOwn={c.user_id === userId}
                  onUpdate={async (id, content) => {
                    const updated = await updateComment(id, userId, content)
                    onCommentUpdated?.(post.id, updated)
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteComment(id, userId)
                      onCommentDeleted?.(post.id, id)
                    } catch (err) {
                      console.error('[ReviewPanel] deleteComment threw:', err)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
