'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PostEditor } from '@/components/posts/PostEditor'
import { fetchPost } from '@/lib/api/posts'
import { PostWithDetails } from '@/lib/types'

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<PostWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPost(id)
      .then(setPost)
      .catch((err) => console.error('Failed to load post:', err instanceof Error ? err.message : err))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-400">Post not found</p>
      </div>
    )
  }

  return <PostEditor post={post} />
}
