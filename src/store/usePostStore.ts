import { create } from 'zustand'
import { Channel, PostStatus, PostWithDetails, ChannelSlug } from '@/lib/types'

interface FilterState {
  status: PostStatus | null
  channel: ChannelSlug | null
  search: string
  columns: 2 | 3 | 4
  sort: 'created' | 'scheduled'
}

interface PostStore {
  posts: PostWithDetails[]
  channels: Channel[]
  filters: FilterState
  loading: boolean
  error: string | null

  // Slide-over panel
  selectedPostId: string | null
  newPostDefaults: { scheduled_at?: string } | null
  openPost: (id: string) => void
  openNewPost: (defaults?: { scheduled_at?: string }) => void
  closePost: () => void

  setPosts: (posts: PostWithDetails[]) => void
  setChannels: (channels: Channel[]) => void
  addPost: (post: PostWithDetails) => void
  updatePost: (id: string, post: PostWithDetails) => void
  patchPost: (id: string, patch: Partial<PostWithDetails>) => void
  removePost: (id: string) => void
  setFilters: (filters: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  filteredPosts: () => PostWithDetails[]
}

export const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  channels: [],
  filters: { status: null, channel: null, search: '', columns: 2, sort: 'created' },
  loading: false,
  error: null,
  selectedPostId: null,
  newPostDefaults: null,

  openPost:    (id)       => set({ selectedPostId: id, newPostDefaults: null }),
  openNewPost: (defaults) => set({ newPostDefaults: defaults ?? {}, selectedPostId: null }),
  closePost:   ()         => set({ selectedPostId: null, newPostDefaults: null }),

  setPosts: (posts) => set({ posts }),
  setChannels: (channels) => set({ channels }),
  addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
  updatePost: (id, post) =>
    set((s) => ({ posts: s.posts.map((p) => (p.id === id ? post : p)) })),
  patchPost: (id, patch) =>
    set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  filteredPosts: () => {
    const { posts, filters } = get()
    const filtered = posts.filter((post) => {
      if (filters.status && post.status !== filters.status) return false
      if (filters.channel) {
        const hasChannel = post.post_channels.some(
          (pc) => pc.channel?.slug === filters.channel
        )
        if (!hasChannel) return false
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!post.title.toLowerCase().includes(q) && !post.copy.toLowerCase().includes(q))
          return false
      }
      return true
    })

    if (filters.sort === 'scheduled') {
      return [...filtered].sort((a, b) => {
        // Posts without a scheduled date go to the end
        if (!a.scheduled_at && !b.scheduled_at) return 0
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      })
    }
    // Default: most recently created first (already the API order, but enforce it)
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },
}))
