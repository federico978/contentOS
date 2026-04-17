'use client'

import { Heart, MessageCircle, Send, Bookmark, ImageIcon } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { BigSurAvatar } from '@/components/ui/bigsur-avatar'

interface Props {
  post: PostWithDetails | null
}

export function MiniInstagramPreview({ post }: Props) {
  if (!post) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-neutral-50/50 px-4 py-5 text-center">
        <p className="text-[11px] text-neutral-300">
          Hover sobre un post para ver su preview
        </p>
      </div>
    )
  }

  const media = post.media_files?.find((m) => m.type !== 'cover')

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
      {/* Label */}
      <div className="border-b border-[#F2F2F2] px-3 py-1.5">
        <p className="text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
          Vista previa · Instagram
        </p>
      </div>

      {/* Fake profile row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <BigSurAvatar size={24} />
        <span className="text-[11px] font-semibold text-neutral-800">bigsur.energy</span>
        <span className="ml-auto text-[10px] text-[#0095F6] font-semibold">Seguir</span>
      </div>

      {/* Image */}
      <div className="aspect-square w-full overflow-hidden bg-neutral-100">
        {media ? (
          media.type === 'video'
            ? <video src={media.url} className="h-full w-full object-cover" muted />
            : <img src={media.url} alt={post.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-neutral-300" />
            <p className="text-[10px] text-neutral-300">Sin imagen</p>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center px-3 py-2">
        <div className="flex items-center gap-3">
          <Heart className="h-4 w-4 text-neutral-700" />
          <MessageCircle className="h-4 w-4 text-neutral-700" />
          <Send className="h-4 w-4 text-neutral-700" />
        </div>
        <Bookmark className="ml-auto h-4 w-4 text-neutral-700" />
      </div>

      {/* Copy */}
      <div className="px-3 pb-3">
        {post.copy ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-neutral-700">
            <span className="font-semibold">bigsur.energy </span>
            {post.copy}
          </p>
        ) : (
          <p className="text-[11px] italic text-neutral-300">Sin copy</p>
        )}
      </div>
    </div>
  )
}
