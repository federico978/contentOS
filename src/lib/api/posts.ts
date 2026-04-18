import { createClient } from '@/lib/supabase/client'
import { PostFormData, PostWithDetails, ReviewPost, Channel, MediaFile, PostStatus } from '@/lib/types'
import { STORAGE_BUCKET } from '@/lib/constants'

export async function fetchChannels(): Promise<Channel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function fetchPosts(): Promise<PostWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_channels (
        *,
        channel: channels (*)
      ),
      media_files (*)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as PostWithDetails[]) || []
}

export async function fetchReviewPosts(): Promise<ReviewPost[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_channels (
        *,
        channel: channels (*)
      ),
      media_files (*),
      post_approvals (
        *,
        user_profiles (full_name, email)
      ),
      post_comments (
        *,
        user_profiles (full_name, email)
      )
    `)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data as ReviewPost[]) || []
}

export async function fetchPost(id: string): Promise<PostWithDetails> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_channels (
        *,
        channel: channels (*)
      ),
      media_files (*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as PostWithDetails
}

export async function createPost(
  formData: PostFormData,
  userId: string,
  mediaFile?: File
): Promise<PostWithDetails> {
  const supabase = createClient()

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      title: formData.title,
      copy: formData.copy,
      status: formData.status,
      scheduled_at: formData.scheduled_at,
      external_media_url: formData.external_media_url || null,
    })
    .select()
    .single()

  if (postError) throw postError

  // Upload media
  if (mediaFile) {
    await uploadMedia(post.id, userId, mediaFile)
  }

  // Create post_channels
  const enabledChannels = formData.channels.filter((c) => c.enabled)
  if (enabledChannels.length > 0) {
    const { error: channelError } = await supabase.from('post_channels').insert(
      enabledChannels.map((c) => ({
        post_id: post.id,
        channel_id: c.channel_id,
        copy_override: c.copy_override || null,
        status: formData.status,
        scheduled_at: c.channel_scheduled_at || null,
      }))
    )
    if (channelError) throw channelError
  }

  return fetchPost(post.id)
}

export async function updatePost(
  id: string,
  formData: PostFormData,
  userId: string,
  mediaFile?: File
): Promise<PostWithDetails> {
  const supabase = createClient()

  const { error: postError } = await supabase
    .from('posts')
    .update({
      title: formData.title,
      copy: formData.copy,
      status: formData.status,
      scheduled_at: formData.scheduled_at,
      external_media_url: formData.external_media_url || null,
    })
    .eq('id', id)

  if (postError) throw postError

  // Upload new media if provided
  if (mediaFile) {
    await uploadMedia(id, userId, mediaFile)
  }

  // Replace post_channels
  await supabase.from('post_channels').delete().eq('post_id', id)

  const enabledChannels = formData.channels.filter((c) => c.enabled)
  if (enabledChannels.length > 0) {
    const { error: channelError } = await supabase.from('post_channels').insert(
      enabledChannels.map((c) => ({
        post_id: id,
        channel_id: c.channel_id,
        copy_override: c.copy_override || null,
        status: formData.status,
        scheduled_at: c.channel_scheduled_at || null,
      }))
    )
    if (channelError) throw channelError
  }

  return fetchPost(id)
}

export async function deletePost(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
}

export async function duplicatePost(
  postId: string,
  targetChannelId: string,
  userId: string
): Promise<PostWithDetails> {
  const supabase = createClient()
  const original = await fetchPost(postId)

  const { data: newPost, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      title: `${original.title} (copy)`,
      copy: original.copy,
      status: 'draft',
      scheduled_at: original.scheduled_at,
      parent_post_id: postId,
    })
    .select()
    .single()

  if (postError) throw postError

  // Copy media references
  if (original.media_files?.length > 0) {
    await supabase.from('media_files').insert(
      original.media_files.map((m) => ({
        post_id: newPost.id,
        url: m.url,
        type: m.type,
        size_bytes: m.size_bytes,
      }))
    )
  }

  // Assign to target channel
  await supabase.from('post_channels').insert({
    post_id: newPost.id,
    channel_id: targetChannelId,
    copy_override: null,
    status: 'draft',
  })

  return fetchPost(newPost.id)
}

export async function uploadMedia(
  postId: string,
  userId: string,
  file: File
): Promise<MediaFile> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${postId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  const type = file.type.startsWith('video') ? 'video' : 'image'

  // Remove old main media for this post (keep cover images)
  await supabase.from('media_files').delete().eq('post_id', postId).neq('type', 'cover')

  const { data: mediaFile, error: mediaError } = await supabase
    .from('media_files')
    .insert({
      post_id: postId,
      url: publicUrl,
      type,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (mediaError) throw mediaError
  return mediaFile
}

export async function uploadCoverImage(
  postId: string,
  userId: string,
  file: File
): Promise<MediaFile> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${postId}/cover-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  // Replace any existing cover for this post
  await supabase.from('media_files').delete().eq('post_id', postId).eq('type', 'cover')

  const { data: mediaFile, error } = await supabase
    .from('media_files')
    .insert({ post_id: postId, url: publicUrl, type: 'cover', size_bytes: file.size })
    .select()
    .single()
  if (error) {
    // Most likely cause: the `type` column has a CHECK constraint that doesn't include 'cover'.
    // Fix: ALTER TABLE media_files DROP CONSTRAINT media_files_type_check;
    //       ALTER TABLE media_files ADD CONSTRAINT media_files_type_check CHECK (type IN ('image','video','cover'));
    throw new Error(`uploadCoverImage insert failed: ${error.message} (code: ${error.code})`)
  }
  return mediaFile
}

export async function deleteMediaFile(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('media_files').delete().eq('id', id)
  if (error) throw error
}

export async function updateChannelScheduledAt(
  postChannelId: string,
  scheduledAt: string | null,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('post_channels')
    .update({ scheduled_at: scheduledAt })
    .eq('id', postChannelId)
  if (error) {
    throw new Error(
      `post_channels update failed — ${error.message} (code: ${error.code}, hint: ${error.hint ?? 'none'})`,
    )
  }
}

/**
 * Update or create a post_channels row for a given (post, channel) pair.
 * Safe to call regardless of whether the row already exists or has a
 * temporary optimistic id in the client store.
 */
export async function upsertChannelScheduledAt(
  postId: string,
  channelId: string,
  scheduledAt: string,
  postStatus: PostStatus,
): Promise<void> {
  const supabase = createClient()

  // Try to update the existing row (keyed on post_id + channel_id, not the row id)
  const { data: updated, error: updateError } = await supabase
    .from('post_channels')
    .update({ scheduled_at: scheduledAt })
    .eq('post_id', postId)
    .eq('channel_id', channelId)
    .select('id')

  if (updateError) {
    throw new Error(
      `post_channels update failed — ${updateError.message} (code: ${updateError.code}, hint: ${updateError.hint ?? 'none'})`,
    )
  }

  // No row existed — insert it (assigns the channel and sets the date in one step)
  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from('post_channels')
      .insert({
        post_id:      postId,
        channel_id:   channelId,
        scheduled_at: scheduledAt,
        status:       postStatus,
        copy_override: null,
      })
    if (insertError) {
      throw new Error(
        `post_channels insert failed — ${insertError.message} (code: ${insertError.code}, hint: ${insertError.hint ?? 'none'})`,
      )
    }
  }
}

export async function togglePostChannel(
  postId: string,
  channelId: string,
  enabled: boolean,
  status: PostStatus
): Promise<void> {
  const supabase = createClient()

  if (enabled) {
    // Use manual upsert: update if row exists, insert if it doesn't.
    // A plain insert() fails with a unique constraint error when the row was
    // previously deleted then quickly re-added, or when optimistic state diverges.
    const { data: updated, error: updateError } = await supabase
      .from('post_channels')
      .update({ status, copy_override: null })
      .eq('post_id', postId)
      .eq('channel_id', channelId)
      .select('id')

    if (updateError) {
      throw new Error(
        `post_channels update failed — ${updateError.message} (code: ${updateError.code})`,
      )
    }

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from('post_channels').insert({
        post_id: postId,
        channel_id: channelId,
        copy_override: null,
        status,
      })
      if (insertError) {
        throw new Error(
          `post_channels insert failed — ${insertError.message} (code: ${insertError.code})`,
        )
      }
    }
  } else {
    const { error } = await supabase
      .from('post_channels')
      .delete()
      .eq('post_id', postId)
      .eq('channel_id', channelId)
    if (error) {
      throw new Error(
        `post_channels delete failed — ${error.message} (code: ${error.code})`,
      )
    }
  }
}

export async function updatePostScheduledAt(id: string, scheduledAt: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('posts')
    .update({ scheduled_at: scheduledAt, status: 'scheduled' })
    .eq('id', id)
  if (error) throw error
}
