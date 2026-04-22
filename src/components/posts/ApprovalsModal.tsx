'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toArDate } from '@/lib/dates'
import { PostComment, PostApproval } from '@/lib/types'
import { getComments, getApprovals } from '@/lib/api/profiles'

interface Props {
  postId: string
  postTitle: string
  onClose: () => void
}

function displayName(u?: { email: string | null; full_name: string | null } | null): string {
  return u?.full_name || u?.email || 'Usuario'
}

export function ApprovalsModal({ postId, postTitle, onClose }: Props) {
  const [comments,  setComments]  = useState<PostComment[]>([])
  const [approvals, setApprovals] = useState<PostApproval[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    setComments([])
    setApprovals([])
    async function load() {
      try {
        const [c, a] = await Promise.all([getComments(postId), getApprovals(postId)])
        setComments(c)
        setApprovals(a)
      } catch {
        // Tables might not exist yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [postId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[480px] max-h-[80vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#F0F0F0] px-5 py-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900">Aprobaciones y comentarios</h2>
            <p className="mt-0.5 text-[12px] text-neutral-400 line-clamp-1">{postTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-500" />
            </div>
          ) : (
            <>
              {/* Approvals section */}
              <div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Decisiones de revisores ({approvals.length})
                </p>
                {approvals.length === 0 ? (
                  <p className="text-[12.5px] text-neutral-400 italic">Sin decisiones aún</p>
                ) : (
                  <div className="space-y-2">
                    {approvals.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 rounded-lg border border-[#F0F0F0] p-3">
                        {a.status === 'approved' ? (
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-medium text-neutral-800">
                              {displayName(a.user_profiles)}
                            </span>
                            <span className="text-[11px] text-neutral-400 shrink-0">
                              {format(toArDate(a.created_at), 'dd/MM HH:mm')}
                            </span>
                          </div>
                          <span className={`text-[11.5px] font-medium ${a.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {a.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                          {a.comment && (
                            <p className="mt-1 text-[12px] text-neutral-600">{a.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments section */}
              <div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Comentarios ({comments.length})
                </p>
                {comments.length === 0 ? (
                  <p className="text-[12.5px] text-neutral-400 italic">Sin comentarios</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-medium text-neutral-800">
                              {displayName(c.user_profiles)}
                            </span>
                            <span className="text-[11px] text-neutral-400 shrink-0">
                              {format(toArDate(c.created_at), 'dd/MM HH:mm')}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-neutral-600">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ApprovalStatusBadge({
  status,
  onClick,
}: {
  status: 'pending' | 'approved' | 'rejected' | 'mixed'
  onClick: (e: React.MouseEvent) => void
}) {
  const cfg = {
    pending:  { label: 'Pendiente',      icon: Clock,         color: 'text-neutral-500',  bg: 'bg-neutral-100' },
    approved: { label: 'Aprobado',       icon: CheckCircle,   color: 'text-emerald-600',  bg: 'bg-emerald-50' },
    rejected: { label: 'Rechazado',      icon: XCircle,       color: 'text-red-600',      bg: 'bg-red-50' },
    mixed:    { label: 'Revisión mixta', icon: AlertCircle,   color: 'text-amber-600',    bg: 'bg-amber-50' },
  }[status]

  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      data-no-dnd="true"
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-opacity hover:opacity-80 ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </button>
  )
}
