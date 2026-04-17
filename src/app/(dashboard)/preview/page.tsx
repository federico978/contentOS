'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { addDays } from 'date-fns'
import { toast } from 'sonner'
import { usePostStore } from '@/store/usePostStore'

import { fetchPosts, fetchChannels, updatePostScheduledAt } from '@/lib/api/posts'
import { PostWithDetails, ChannelSlug } from '@/lib/types'
import { InstagramFeed } from '@/components/feed/InstagramFeed'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { GlassButton } from '@/components/ui/glass-button'
import { LinkedInFeed } from '@/components/feed/LinkedInFeed'
import { XFeed } from '@/components/feed/XFeed'

const CHANNELS: { slug: ChannelSlug; label: string }[] = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'linkedin',  label: 'LinkedIn' },
  { slug: 'x',         label: 'X' },
]

// ── Date interpolation logic ──────────────────────────────────────────────────
function computeNewDate(
  items: PostWithDetails[],
  movedId: string,
  newIndex: number
): string {
  const prev = newIndex > 0 ? items[newIndex - 1] : null
  const next = newIndex < items.length - 1 ? items[newIndex + 1] : null

  const prevDate = prev?.scheduled_at ? new Date(prev.scheduled_at) : null
  const nextDate = next?.scheduled_at ? new Date(next.scheduled_at) : null

  if (!prevDate && !nextDate) {
    // No neighbours with dates — set tomorrow
    return addDays(new Date(), 1).toISOString()
  }
  if (!prevDate && nextDate) {
    // Moved to start: 1 day before first
    return addDays(nextDate, -1).toISOString()
  }
  if (prevDate && !nextDate) {
    // Moved to end: 1 day after last
    return addDays(prevDate, 1).toISOString()
  }
  // Between two dated posts: midpoint
  const mid = new Date((prevDate!.getTime() + nextDate!.getTime()) / 2)
  return mid.toISOString()
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const { posts, setPosts, setChannels, loading, setLoading, openPost } = usePostStore()
  const [activeChannel, setActiveChannel] = useState<ChannelSlug>('instagram')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [p, c] = await Promise.all([fetchPosts(), fetchChannels()])
        setPosts(p); setChannels(c)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [setPosts, setChannels, setLoading])

  // Filter posts that have the active channel assigned (use channel-specific date if available)
  const channelPosts = posts
    .filter((p) =>
      p.post_channels.some((pc) => {
        if (pc.channel?.slug !== activeChannel) return false
        return !!(pc.scheduled_at || p.scheduled_at)
      })
    )
    .sort((a, b) => {
      const pcA = a.post_channels.find((pc) => pc.channel?.slug === activeChannel)
      const pcB = b.post_channels.find((pc) => pc.channel?.slug === activeChannel)
      const dateA = pcA?.scheduled_at || a.scheduled_at
      const dateB = pcB?.scheduled_at || b.scheduled_at
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

  async function handleReorder(
    reorderedItems: PostWithDetails[],
    movedId: string,
    newIndex: number
  ) {
    const newDate = computeNewDate(reorderedItems, movedId, newIndex)
    try {
      await updatePostScheduledAt(movedId, newDate)
      // Update the store so other views stay in sync
      const updated = posts.map((p) =>
        p.id === movedId ? { ...p, scheduled_at: newDate, status: 'scheduled' as const } : p
      )
      setPosts(updated)
      toast.success('Date updated')
    } catch {
      toast.error('Failed to update date')
    }
  }

  const sharedProps = {
    posts: channelPosts,
    onReorder: handleReorder,
    onPostClick: (id: string) => openPost(id),
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <h1 className="text-[14px] font-black text-[#0A0A0A]">Feed Preview</h1>
        {/* Channel selector */}
        <div className="flex items-center gap-1">
          {CHANNELS.map(({ slug, label }) => (
            <GlassButton
              key={slug}
              active={activeChannel === slug}
              onClick={() => setActiveChannel(slug)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px]"
            >
              <ChannelIcon slug={slug} size={13} />
              {label}
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Feed area */}
      <div className="flex-1 overflow-y-auto bg-[#F2F2F2] px-4 py-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
          </div>
        ) : channelPosts.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13.5px] font-medium text-neutral-600">No posts for this channel</p>
            <p className="text-[12.5px] text-neutral-400">
              Assign posts to <span className="capitalize">{activeChannel}</span> to see them here.
            </p>
          </div>
        ) : (
          <>
            {activeChannel === 'instagram' && <InstagramFeed {...sharedProps} />}
            {activeChannel === 'linkedin'  && <LinkedInFeed  {...sharedProps} />}
            {activeChannel === 'x'         && <XFeed         {...sharedProps} />}
          </>
        )}
      </div>
    </div>
  )
}
