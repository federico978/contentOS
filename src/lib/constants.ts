import { ChannelSlug, PostStatus } from './types'

export const CHANNELS: { slug: ChannelSlug; name: string; color: string; bg: string; dot: string }[] = [
  { slug: 'instagram', name: 'Instagram', color: 'text-pink-600',  bg: 'bg-pink-50',   dot: 'bg-pink-500' },
  { slug: 'linkedin',  name: 'LinkedIn',  color: 'text-blue-700',  bg: 'bg-blue-50',   dot: 'bg-blue-600' },
  { slug: 'x',         name: 'X',         color: 'text-neutral-800', bg: 'bg-neutral-100', dot: 'bg-neutral-800' },
]

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; dot: string; dotColor: string }> = {
  draft:     { label: 'Draft',     color: 'text-neutral-500', dot: 'bg-[#888888]',   dotColor: '#888888' },
  scheduled: { label: 'Scheduled', color: 'text-amber-600',   dot: 'bg-amber-400',   dotColor: '#F59E0B' },
  published: { label: 'Published', color: 'text-emerald-600', dot: 'bg-emerald-500', dotColor: '#10B981' },
}

export const STORAGE_BUCKET = 'media'

export const SUPER_ADMIN_EMAIL = 'fedeperel1@gmail.com'
