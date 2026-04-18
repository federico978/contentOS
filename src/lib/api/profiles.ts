import { createClient } from '@/lib/supabase/client'
import { UserProfile, UserRole, PostComment, PostApproval, ApprovalStatus } from '@/lib/types'

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as UserProfile
}

export async function listProfiles(): Promise<UserProfile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`listProfiles: ${error.message} (code: ${error.code}, hint: ${error.hint ?? 'none'})`)
  }
  return (data as UserProfile[]) || []
}

export async function updateRole(userId: string, role: UserRole): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw new Error(`updateRole failed: ${error.message}`)
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<PostComment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, user_profiles(email, full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as PostComment[]) || []
}

export async function createComment(postId: string, userId: string, content: string): Promise<PostComment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select('*, user_profiles(email, full_name)')
    .single()

  if (error) throw new Error(`createComment failed: ${error.message}`)
  return data as PostComment
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function getApprovals(postId: string): Promise<PostApproval[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_approvals')
    .select('*, user_profiles(email, full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as PostApproval[]) || []
}

export async function upsertApproval(
  postId: string,
  userId: string,
  status: 'approved' | 'rejected',
  comment: string | null,
): Promise<void> {
  const supabase = createClient()

  // Upsert the reviewer's vote (one per reviewer per post)
  const { error: apError } = await supabase
    .from('post_approvals')
    .upsert({ post_id: postId, user_id: userId, status, comment }, { onConflict: 'post_id,user_id' })

  if (apError) throw new Error(`upsertApproval failed: ${apError.message}`)

  // Fetch all votes to compute consensus
  const { data: allVotes, error: fetchError } = await supabase
    .from('post_approvals')
    .select('status')
    .eq('post_id', postId)

  if (fetchError) throw new Error(`upsertApproval fetch failed: ${fetchError.message}`)

  // Consensus: any rejection → rejected; at least one approval and zero rejections → approved
  const hasRejected = allVotes?.some((v) => v.status === 'rejected') ?? false
  const hasApproved = allVotes?.some((v) => v.status === 'approved') ?? false
  const nextStatus: ApprovalStatus = hasRejected ? 'rejected' : hasApproved ? 'approved' : 'pending'

  const { error: postError } = await supabase
    .from('posts')
    .update({ approval_status: nextStatus })
    .eq('id', postId)

  if (postError) throw new Error(`approval_status update failed: ${postError.message}`)
}
