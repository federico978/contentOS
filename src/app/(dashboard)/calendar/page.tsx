'use client'

import { useCallback, useEffect, useState } from 'react'
import { startOfWeek, subWeeks } from 'date-fns'
import { CalendarView, CalendarHistoryConfig } from '@/components/calendar/CalendarView'
import { usePostStore } from '@/store/usePostStore'
import { fetchPostsFrom, fetchPostsHistory, fetchChannels } from '@/lib/api/posts'
import { GlassButton } from '@/components/ui/glass-button'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { CHANNELS } from '@/lib/constants'
import { ChannelSlug, PostWithDetails } from '@/lib/types'

export default function CalendarPage() {
  const { posts, setPosts, setChannels, setLoading, loading } = usePostStore()
  const [activeChannel, setActiveChannel] = useState<ChannelSlug | 'all'>('all')

  // ── History state ──────────────────────────────────────────────────────────
  const [historyPosts,   setHistoryPosts]   = useState<PostWithDetails[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyOffset,  setHistoryOffset]  = useState(0)

  // ── Initial load: only from current week onwards ───────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
        const [postsData, channelsData] = await Promise.all([
          fetchPostsFrom(weekStart),
          fetchChannels(),
        ])
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

  // ── History helpers ────────────────────────────────────────────────────────
  const historyRange = useCallback(() => ({
    fromISO: subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 8).toISOString(),
    toISO:   startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
  }), [])

  const handleLoadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { fromISO, toISO } = historyRange()
      const { data, hasMore } = await fetchPostsHistory(fromISO, toISO, 0)
      setHistoryPosts(data)
      setHistoryHasMore(hasMore)
      setHistoryOffset(data.length)
      setHistoryVisible(true)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyRange])

  const handleHideHistory = useCallback(() => {
    setHistoryVisible(false)
    setHistoryPosts([])
    setHistoryHasMore(false)
    setHistoryOffset(0)
  }, [])

  const handleLoadMoreHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { fromISO, toISO } = historyRange()
      const { data, hasMore } = await fetchPostsHistory(fromISO, toISO, historyOffset)
      setHistoryPosts((prev) => [...prev, ...data])
      setHistoryHasMore(hasMore)
      setHistoryOffset((prev) => prev + data.length)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [historyRange, historyOffset])

  const historyConfig: CalendarHistoryConfig = {
    posts:       historyPosts,
    loading:     historyLoading,
    hasMore:     historyHasMore,
    visible:     historyVisible,
    onLoad:      handleLoadHistory,
    onHide:      handleHideHistory,
    onLoadMore:  handleLoadMoreHistory,
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
        <CalendarView
          posts={posts}
          activeChannel={activeChannel}
          loading={loading}
          history={historyConfig}
        />
      </div>
    </div>
  )
}
