'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CalendarView } from '@/components/calendar/CalendarView'
import { usePostStore } from '@/store/usePostStore'
import { fetchPosts, fetchChannels } from '@/lib/api/posts'
import { GlassButton } from '@/components/ui/glass-button'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { CHANNELS } from '@/lib/constants'
import { ChannelSlug } from '@/lib/types'

export default function CalendarPage() {
  const { posts, setPosts, setChannels, setLoading, loading } = usePostStore()
  const [activeChannel, setActiveChannel] = useState<ChannelSlug | 'all'>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [postsData, channelsData] = await Promise.all([fetchPosts(), fetchChannels()])
        setPosts(postsData)
        setChannels(channelsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setPosts, setChannels, setLoading])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Channel filter header */}
      <div
        className="flex items-center gap-1 px-6 py-2.5"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <GlassButton
          active={activeChannel === 'all'}
          onClick={() => setActiveChannel('all')}
          className="px-2.5 py-1 text-[12px]"
        >
          Todos
        </GlassButton>
        {CHANNELS.map(({ slug, name }) => (
          <GlassButton
            key={slug}
            active={activeChannel === slug}
            onClick={() => setActiveChannel(slug as ChannelSlug)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[12px]"
          >
            <ChannelIcon slug={slug} size={12} />
            {name}
          </GlassButton>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <CalendarView posts={posts} activeChannel={activeChannel} />
      </div>
    </div>
  )
}
