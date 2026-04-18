'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  MoreHorizontal, Eye, Pencil, Trash2, Copy, Download,
  ImageIcon, Play, ThumbsUp, MessageSquare,
} from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { PostWithDetails, ChannelSlug } from '@/lib/types'
import { deletePost, togglePostChannel } from '@/lib/api/posts'
import { usePostStore } from '@/store/usePostStore'
import { STATUS_CONFIG } from '@/lib/constants'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { cn } from '@/lib/utils'
import { PreviewModal } from '@/components/previews/PreviewModal'
import { DuplicateModal } from './DuplicateModal'
import { ApprovalsModal, ApprovalStatusBadge } from './ApprovalsModal'
import { useProfileStore } from '@/store/useProfileStore'

const CHANNEL_SLUGS = ['instagram', 'linkedin', 'x'] as const

interface Props {
  post: PostWithDetails
  onHover?: (id: string) => void
  onLeave?: () => void
}

export function PostCard({ post, onHover, onLeave }: Props) {
  const { removePost, openPost, patchPost, channels: allChannels } = usePostStore()
  const role = useProfileStore((s) => s.role)
  const [showPreview,    setShowPreview]    = useState(false)
  const [showDuplicate,  setShowDuplicate]  = useState(false)
  const [showApprovals,  setShowApprovals]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { postId: post.id },
  })

  const statusCfg        = STATUS_CONFIG[post.status]
  const media            = post.media_files?.find((m) => m.type !== 'cover')
  const coverMedia       = post.media_files?.find((m) => m.type === 'cover')
  const activeChannelIds = new Set(post.post_channels.map((pc) => pc.channel_id))

  // Compute real approval status from votes
  const votes       = post.post_approvals ?? []
  const voteCount   = votes.length
  const commentCount = post.post_comments?.length ?? 0
  const hasApproved = votes.some((v) => v.status === 'approved')
  const hasRejected = votes.some((v) => v.status === 'rejected')
  const computedApprovalStatus =
    hasApproved && hasRejected ? 'mixed'
    : hasRejected              ? 'rejected'
    : hasApproved              ? 'approved'
    :                            'pending'

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    try {
      await deletePost(post.id)
      removePost(post.id)
      toast.success('Post deleted')
    } catch { toast.error('Failed to delete post') }
    finally  { setDeleting(false) }
  }

  async function handleDownload() {
    if (!media) return
    const res  = await fetch(media.url)
    const blob = await res.blob()
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = media.url.split('/').pop() || 'media'
    a.click()
    toast.success('Downloading...')
  }

  async function handleToggleChannel(e: React.MouseEvent, slug: string) {
    e.stopPropagation()
    const ch = allChannels.find((c) => c.slug === slug)
    if (!ch) return

    const wasEnabled = activeChannelIds.has(ch.id)
    const nowEnabled = !wasEnabled

    const optimisticChannels = nowEnabled
      ? [
          ...post.post_channels,
          {
            id: `tmp-${ch.id}`, post_id: post.id, channel_id: ch.id,
            copy_override: null, status: post.status, channel: ch,
          },
        ]
      : post.post_channels.filter((pc) => pc.channel_id !== ch.id)

    patchPost(post.id, { post_channels: optimisticChannels })

    try {
      await togglePostChannel(post.id, ch.id, nowEnabled, post.status)
    } catch (err) {
      patchPost(post.id, { post_channels: post.post_channels })
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Error al actualizar el canal: ${msg}`)
    }
  }

  return (
    <>
      {/*
        The whole card is the drag source. `data-no-dnd="true"` on interactive
        children prevents the SmartPointerSensor from activating drag from those.
      */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => openPost(post.id)}
        onMouseEnter={() => onHover?.(post.id)}
        onMouseLeave={() => onLeave?.()}
        className={cn(
          'group relative flex cursor-grab flex-col overflow-hidden rounded-xl border border-[#D9D9D9] bg-white transition-all',
          'hover:border-neutral-400 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]',
          'active:cursor-grabbing',
          deleting   && 'pointer-events-none opacity-40',
          isDragging && 'opacity-40 shadow-xl',
        )}
      >
        {/* ── Thumbnail ─────────────────────────────────────────── */}
        <div className="relative h-40 overflow-hidden bg-neutral-100">
          {media ? (
            <>
              {media.type === 'video'
                ? <video src={media.url} className="h-full w-full object-cover" muted />
                : <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
              }
              {media.type === 'video' && (
                <div className="absolute right-2 bottom-2 flex items-center justify-center rounded-full bg-black/40 p-1.5">
                  <Play className="h-2.5 w-2.5 fill-white text-white" />
                </div>
              )}
            </>
          ) : coverMedia ? (
            <>
              <img src={coverMedia.url} alt={post.title} className="h-full w-full object-cover" />
              <div className="absolute right-2 bottom-2 flex items-center justify-center rounded-full bg-black/40 p-1.5">
                <Play className="h-2.5 w-2.5 fill-white text-white" />
              </div>
            </>
          ) : post.external_media_url ? (
            // External video with no cover — neutral gray, no icon
            null
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-neutral-200" />
            </div>
          )}

          {/* Approval badge — super_admin only */}
          {role === 'super_admin' && (
            <div className="absolute right-2 bottom-2 z-10" data-no-dnd="true">
              <ApprovalStatusBadge
                status={computedApprovalStatus}
                onClick={(e) => { e.stopPropagation(); setShowApprovals(true) }}
              />
            </div>
          )}

          {/* Status badge — hidden for drafts */}
          {post.status !== 'draft' && (
            <div className="absolute left-2 top-2">
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px]"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#888888',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: statusCfg.dotColor }}
                />
                {statusCfg.label}
              </span>
            </div>
          )}

          {/* Dropdown — data-no-dnd prevents drag from starting here */}
          <div
            data-no-dnd="true"
            className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-neutral-500 shadow-sm transition-colors hover:bg-white hover:text-neutral-700 focus:outline-none"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-[12.5px]">
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowPreview(true) }}>
                  <Eye className="mr-2 h-3.5 w-3.5" />Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); openPost(post.id) }}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowDuplicate(true) }}>
                  <Copy className="mr-2 h-3.5 w-3.5" />Duplicate to channel
                </DropdownMenuItem>
                {media && (
                  <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDownload() }}>
                    <Download className="mr-2 h-3.5 w-3.5" />Download media
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete() }}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-900">
            {post.title || 'Untitled post'}
          </h3>
          <p className="line-clamp-2 text-[12px] leading-relaxed text-neutral-400">
            {post.copy || <span className="italic">No copy</span>}
          </p>
        </div>

        {/* ── Footer: channel icons + date ──────────────────────── */}
        <div className="flex items-center justify-between border-t border-[#F2F2F2] px-3 py-2">
          {/* Channel icons — data-no-dnd prevents drag from starting here */}
          <div className="flex items-center gap-1.5" data-no-dnd="true">
            {CHANNEL_SLUGS.map((slug) => {
              const ch       = allChannels.find((c) => c.slug === slug)
              const isActive = ch ? activeChannelIds.has(ch.id) : false
              return (
                <button
                  key={slug}
                  onClick={(e) => handleToggleChannel(e, slug)}
                  title={`${isActive ? 'Quitar de' : 'Agregar a'} ${slug}`}
                  className="rounded transition-transform hover:scale-110 active:scale-95"
                >
                  <ChannelIcon slug={slug} size={18} inactive={!isActive} />
                </button>
              )
            })}
            {/* Vote / comment indicators — super_admin only */}
            {role === 'super_admin' && (voteCount > 0 || commentCount > 0) && (
              <div className="ml-1 flex items-center gap-1.5">
                {voteCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10.5px] text-neutral-400">
                    <ThumbsUp className="h-3 w-3" strokeWidth={1.75} />
                    {voteCount}
                  </span>
                )}
                {commentCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10.5px] text-neutral-400">
                    <MessageSquare className="h-3 w-3" strokeWidth={1.75} />
                    {commentCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-0.5">
            {post.post_channels.map((pc) => {
              if (!pc.channel?.slug) return null
              const date = pc.scheduled_at || post.scheduled_at
              if (!date) return null
              return (
                <span key={pc.id} className="flex items-center gap-1 text-[10.5px] text-neutral-400">
                  <ChannelIcon slug={pc.channel.slug as ChannelSlug} size={10} gray />
                  {format(new Date(date), 'MMM d')}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {showPreview   && <PreviewModal    post={post} onClose={() => setShowPreview(false)} />}
      {showDuplicate && <DuplicateModal  post={post} onClose={() => setShowDuplicate(false)} />}
      {showApprovals && (
        <ApprovalsModal
          postId={post.id}
          postTitle={post.title || 'Untitled'}
          onClose={() => setShowApprovals(false)}
        />
      )}
    </>
  )
}
