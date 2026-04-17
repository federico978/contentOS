'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { duplicatePost } from '@/lib/api/posts'
import { usePostStore } from '@/store/usePostStore'
import { PostWithDetails } from '@/lib/types'
import { CHANNELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Props { post: PostWithDetails; onClose: () => void }

export function DuplicateModal({ post, onClose }: Props) {
  const router  = useRouter()
  const { channels, addPost } = usePostStore()
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    if (!selectedChannelId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const newPost = await duplicatePost(post.id, selectedChannelId, user.id)
      addPost(newPost)
      toast.success('Post duplicated — edit the copy for this channel')
      onClose()
      router.push(`/posts/${newPost.id}`)
    } catch {
      toast.error('Failed to duplicate post')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#D9D9D9] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-5 py-3.5">
          <h2 className="text-[13.5px] font-black text-[#0A0A0A]">Duplicate to channel</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-[12.5px] text-neutral-500 leading-relaxed">
            Duplicate <span className="font-medium text-neutral-800">{post.title}</span> to a channel. You can edit the copy per-channel after.
          </p>
          <div className="space-y-1.5">
            {channels.map((ch) => {
              const meta = CHANNELS.find((c) => c.slug === ch.slug)
              const isSelected = selectedChannelId === ch.id
              return (
                <label
                  key={ch.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-all',
                    isSelected ? 'border-[#0A0A0A] bg-[#F2F2F2]' : 'border-[#D9D9D9] hover:border-neutral-400 hover:bg-neutral-50'
                  )}
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D9D9D9] bg-white'
                  )}>
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    <input type="radio" name="channel" value={ch.id} checked={isSelected}
                      onChange={() => setSelectedChannelId(ch.id)} className="sr-only" />
                  </div>
                  <span className={cn('text-[13px] font-medium', meta?.color)}>{ch.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E5E5E5] px-5 py-3.5">
          <button onClick={onClose} className="rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!selectedChannelId || loading}
            className="flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:-translate-y-px disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Duplicate
          </button>
        </div>
      </div>
    </div>
  )
}
