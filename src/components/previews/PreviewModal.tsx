'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { PostWithDetails } from '@/lib/types'
import { InstagramPreview } from './InstagramPreview'
import { LinkedInPreview } from './LinkedInPreview'
import { XPreview } from './XPreview'
import { CHANNELS } from '@/lib/constants'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { cn } from '@/lib/utils'

interface Props { post: PostWithDetails; onClose: () => void }

const PREVIEW_COMPONENTS = {
  instagram: InstagramPreview,
  linkedin:  LinkedInPreview,
  x:         XPreview,
} as const

export function PreviewModal({ post, onClose }: Props) {
  const enabledChannels = post.post_channels
    .map((pc) => ({ slug: pc.channel?.slug, name: pc.channel?.name, copyOverride: pc.copy_override }))
    .filter((c) => c.slug)

  const tabs = enabledChannels.length > 0
    ? enabledChannels
    : CHANNELS.map((c) => ({ slug: c.slug, name: c.name, copyOverride: null }))

  const [active, setActive] = useState(tabs[0]?.slug || 'instagram')
  const activeChannel = tabs.find((c) => c.slug === active)
  const PreviewComponent = PREVIEW_COMPONENTS[active as keyof typeof PREVIEW_COMPONENTS]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-[#F2F2F2] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] bg-white px-5 py-3">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const meta = CHANNELS.find((c) => c.slug === tab.slug)
              return (
                <button
                  key={tab.slug}
                  onClick={() => setActive(tab.slug!)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                    active === tab.slug
                      ? 'bg-[#0A0A0A] text-white shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                  )}
                >
                  <ChannelIcon slug={tab.slug!} size={13} />
                  {tab.name || meta?.name}
                </button>
              )
            })}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-8">
          {PreviewComponent
            ? <PreviewComponent post={post} copyOverride={activeChannel?.copyOverride} />
            : <div className="text-[13px] text-neutral-400">No preview available</div>
          }
        </div>
      </div>
    </div>
  )
}
