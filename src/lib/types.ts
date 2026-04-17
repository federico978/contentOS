export type PostStatus = 'draft' | 'scheduled' | 'published'
export type ChannelSlug = 'instagram' | 'linkedin' | 'x'
export type MediaType = 'image' | 'video' | 'cover'

export interface Post {
  id: string
  user_id: string
  title: string
  copy: string
  status: PostStatus
  scheduled_at: string | null
  parent_post_id: string | null
  external_media_url: string | null
  created_at: string
  post_channels?: PostChannel[]
  media_files?: MediaFile[]
}

export interface Channel {
  id: string
  name: string
  slug: ChannelSlug
}

export interface PostChannel {
  id: string
  post_id: string
  channel_id: string
  copy_override: string | null
  status: PostStatus
  scheduled_at?: string | null
  channel?: Channel
}

export interface MediaFile {
  id: string
  post_id: string
  url: string
  type: MediaType
  size_bytes: number
}

export interface PostWithDetails extends Post {
  post_channels: (PostChannel & { channel: Channel | undefined })[]
  media_files: MediaFile[]
}

export interface PostFormData {
  title: string
  copy: string
  status: PostStatus
  scheduled_at: string | null
  external_media_url: string | null
  channels: {
    channel_id: string
    slug: ChannelSlug
    enabled: boolean
    copy_override: string
    channel_scheduled_at: string | null
  }[]
}
