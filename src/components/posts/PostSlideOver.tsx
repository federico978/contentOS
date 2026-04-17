'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { usePostStore } from '@/store/usePostStore'
import { fetchPost } from '@/lib/api/posts'
import { PostWithDetails } from '@/lib/types'
import { PostEditor } from './PostEditor'

export function PostSlideOver() {
  const { selectedPostId, newPostDefaults, closePost } = usePostStore()
  const [post, setPost]       = useState<PostWithDetails | null>(null)
  const [loading, setLoading] = useState(false)

  // Load post whenever selectedPostId changes
  useEffect(() => {
    if (!selectedPostId) { setPost(null); return }
    setLoading(true)
    fetchPost(selectedPostId)
      .then(setPost)
      .catch((err) => console.error('Failed to load post:', err instanceof Error ? err.message : err))
      .finally(() => setLoading(false))
  }, [selectedPostId])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePost()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closePost])

  // Lock body scroll while open
  useEffect(() => {
    if (selectedPostId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedPostId])

  const isOpen = Boolean(selectedPostId) || Boolean(newPostDefaults)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={closePost}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 0.8 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[42%] min-w-[520px] flex-col bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* Close button */}
            <button
              onClick={closePost}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                </div>
              ) : post ? (
                <PostEditor post={post} onClose={closePost} />
              ) : newPostDefaults != null ? (
                <PostEditor defaults={newPostDefaults} onClose={closePost} />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-neutral-400">Post not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
