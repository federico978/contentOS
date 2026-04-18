'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, Eye, Loader2, Check, Link, Info } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

import { MediaUpload } from '@/components/media/MediaUpload'
import { PreviewModal } from '@/components/previews/PreviewModal'
import { createPost, updatePost, fetchChannels, uploadCoverImage, deleteMediaFile } from '@/lib/api/posts'
import { normalizeVideoUrl, isExternalVideoUrl } from '@/lib/external-video'
import { usePostStore } from '@/store/usePostStore'
import { Channel, PostWithDetails } from '@/lib/types'
import { CHANNELS } from '@/lib/constants'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  title:        z.string().min(1, 'Title is required'),
  copy:         z.string().min(1, 'Copy is required'),
  status:       z.enum(['draft', 'scheduled', 'published']),
  scheduled_at: z.string().nullable(),
  channels: z.array(z.object({
    channel_id:           z.string(),
    slug:                 z.enum(['instagram', 'linkedin', 'x']),
    enabled:              z.boolean(),
    copy_override:        z.string(),
    channel_scheduled_at: z.string().nullable(),
  })),
})

type FormValues = z.infer<typeof schema>

export function PostEditor({
  post,
  onClose,
  defaults,
}: {
  post?: PostWithDetails
  onClose?: () => void
  defaults?: { scheduled_at?: string }
}) {
  const router = useRouter()
  const { addPost, updatePost: updateInStore } = usePostStore()
  const [allChannels, setAllChannels] = useState<Channel[]>([])
  const [mediaFile, setMediaFile]               = useState<File | null>(null)
  const [removeMedia, setRemoveMedia]           = useState(false)
  const [coverFile, setCoverFile]               = useState<File | null>(null)
  const [removeCover, setRemoveCover]           = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [autoSaveStatus,  setAutoSaveStatus]  = useState<'idle' | 'pending' | 'saved' | 'error'>('idle')
  const autoSaveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitializedRef    = useRef(false)
  const savingRef           = useRef(false)
  const [showPreview, setShowPreview]           = useState(false)
  const [userId, setUserId]                     = useState('')
  const [externalMediaUrl, setExternalMediaUrl] = useState(post?.external_media_url ?? '')
  const [showUrlHint, setShowUrlHint]           = useState(false)
  const [pasteFlashMain, setPasteFlashMain]     = useState(false)
  const [pasteFlashCover, setPasteFlashCover]   = useState(false)

  // Refs for the document-level paste handler (avoids stale closures in useEffect)
  const mediaFileRef       = useRef<File | null>(null)
  const coverFileRef       = useRef<File | null>(null)
  const externalUrlRef     = useRef<string>('')
  const existingMediaRef   = useRef<boolean>(false)
  const existingCoverRef   = useRef<boolean>(false)
  const removeCoverRef     = useRef<boolean>(false)

  const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:        post?.title || '',
      copy:         post?.copy  || '',
      status:       post?.status ?? (defaults?.scheduled_at ? 'scheduled' : 'draft'),
      scheduled_at: post?.scheduled_at ?? defaults?.scheduled_at ?? null,
      channels:     [],
    },
  })

  const watchedChannels = watch('channels')
  const watchedCopy     = watch('copy')
  const watchedStatus   = watch('status')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const channels = await fetchChannels()
      setAllChannels(channels)
      setValue('channels', channels.map((ch) => {
        const existing = post?.post_channels?.find((pc) => pc.channel_id === ch.id)
        return {
          channel_id:           ch.id,
          slug:                 ch.slug,
          enabled:              !!existing,
          copy_override:        existing?.copy_override || '',
          channel_scheduled_at: existing?.scheduled_at ?? null,
        }
      }))
      // Allow watch subscription to settle before enabling autosave
      setTimeout(() => { isInitializedRef.current = true }, 0)
    }
    init().catch((err) => console.error('Failed to init post editor:', err instanceof Error ? err.message : err))
  }, [post, setValue])

  // Document-level paste (CMD+V / screenshots / Figma copies)
  useEffect(() => {
    function onDocumentPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (!file) return

      const hasMain = !!mediaFileRef.current || existingMediaRef.current
      const hasCover = !!coverFileRef.current || existingCoverRef.current

      if (!hasMain) {
        // Route to main media
        setMediaFile(file)
        setPasteFlashMain(true)
        setTimeout(() => setPasteFlashMain(false), 500)
      } else if (externalUrlRef.current && !hasCover) {
        // Route to cover (only shown when external URL is set)
        setCoverFile(file)
        setPasteFlashCover(true)
        setTimeout(() => setPasteFlashCover(false), 500)
      }
    }
    document.addEventListener('paste', onDocumentPaste)
    return () => document.removeEventListener('paste', onDocumentPaste)
  }, []) // intentionally empty — reads state via refs

  // ── Autosave ────────────────────────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    if (!post || !isInitializedRef.current || savingRef.current) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (clearStatusTimerRef.current) clearTimeout(clearStatusTimerRef.current)
    setAutoSaveStatus('pending')
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!userId || savingRef.current) return
      try {
        const values  = getValues()
        const payload = { ...values, external_media_url: externalUrlRef.current.trim() || null }
        const updated = await updatePost(post.id, payload, userId)
        updateInStore(post.id, updated)
        setAutoSaveStatus('saved')
        clearStatusTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('[PostEditor] autosave failed:', err)
        setAutoSaveStatus('error')
      }
    }, 1500)
  }, [post, userId, getValues, updateInStore])

  // Watch all form field changes
  useEffect(() => {
    const { unsubscribe } = watch(() => triggerAutoSave())
    return unsubscribe
  }, [watch, triggerAutoSave])

  // Watch external media URL changes
  useEffect(() => {
    triggerAutoSave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMediaUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (clearStatusTimerRef.current) clearTimeout(clearStatusTimerRef.current)
    }
  }, [])

  // ── Manual save ─────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!userId) return
    savingRef.current = true
    setSaving(true)
    // Cancel any pending autosave
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setAutoSaveStatus('idle')
    try {
      const file    = mediaFile || undefined
      const payload = { ...values, external_media_url: externalMediaUrl.trim() || null }

      if (post) {
        // Handle cover removal before update (so fetchPost returns clean state)
        if (removeCover && existingCover) {
          await deleteMediaFile(existingCover.id)
        }
        const updated = await updatePost(post.id, payload, userId, file)
        if (coverFile) await uploadCoverImage(post.id, userId, coverFile)
        // Re-fetch if cover changed so store gets fresh media_files
        const final = coverFile || (removeCover && existingCover)
          ? await import('@/lib/api/posts').then((m) => m.fetchPost(post.id))
          : updated
        updateInStore(post.id, final)
        toast.success('Post saved')
        if (onClose) onClose()
      } else {
        const created = await createPost(payload, userId, file)
        if (coverFile) await uploadCoverImage(created.id, userId, coverFile)
        addPost(coverFile
          ? await import('@/lib/api/posts').then((m) => m.fetchPost(created.id))
          : created
        )
        toast.success('Post created')
        router.push('/posts')
      }
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? String(err)
      toast.error(`Error al guardar: ${msg}`)
      console.error('[PostEditor] save failed:', err)
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const existingMedia = !removeMedia
    ? (post?.media_files?.find((m) => m.type !== 'cover') || null)
    : null
  const existingCover = !removeCover
    ? (post?.media_files?.find((m) => m.type === 'cover') || null)
    : null

  // Keep refs in sync every render so the paste handler always sees fresh state
  mediaFileRef.current     = mediaFile
  coverFileRef.current     = coverFile
  externalUrlRef.current   = externalMediaUrl
  existingMediaRef.current = !!existingMedia
  existingCoverRef.current = !!existingCover
  removeCoverRef.current   = removeCover

  // Cover preview file (for previewPost)
  const coverMediaFiles: import('@/lib/types').MediaFile[] = coverFile
    ? [{ id: 'preview-cover', post_id: post?.id ?? '', url: URL.createObjectURL(coverFile), type: 'cover', size_bytes: 0 }]
    : existingCover ? [existingCover] : []

  const previewPost: PostWithDetails | null = post ? {
    ...post,
    title: watch('title'), copy: watch('copy'),
    external_media_url: externalMediaUrl.trim() || null,
    media_files: [
      ...(existingMedia ? [existingMedia] : []),
      ...coverMediaFiles,
    ],
    post_channels: watchedChannels.filter((c) => c.enabled).map((c, i) => ({
      id: `preview-${i}`, post_id: post.id, channel_id: c.channel_id,
      copy_override: c.copy_override || null, status: watchedStatus,
      channel: allChannels.find((ch) => ch.id === c.channel_id),
    })),
  } : null

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#D9D9D9] px-5 py-3">
        <div className="flex items-center gap-2.5">
          {!onClose && (
            <>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <span className="text-neutral-200">·</span>
            </>
          )}
          <span className="text-[13px] font-bold text-[#0A0A0A]">
            {post ? 'Edit post' : 'New post'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {post && autoSaveStatus !== 'idle' && (
            <span className={cn(
              'text-[11.5px] transition-opacity',
              autoSaveStatus === 'pending' && 'text-neutral-400',
              autoSaveStatus === 'saved'   && 'text-emerald-600',
              autoSaveStatus === 'error'   && 'text-red-500',
            )}>
              {autoSaveStatus === 'pending' && 'Guardando...'}
              {autoSaveStatus === 'saved'   && 'Guardado ✓'}
              {autoSaveStatus === 'error'   && 'Error al guardar'}
            </span>
          )}
          {previewPost && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          )}
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:-translate-y-px disabled:opacity-60 active:scale-[0.99]"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />}
            {post ? 'Save changes' : 'Create post'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-8 py-7">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Title</label>
            <input
              placeholder="Campaign name or title..."
              className={cn(
                'w-full border-0 border-b border-[#D9D9D9] bg-transparent pb-2 text-[18px] font-bold text-[#0A0A0A] placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400',
                errors.title && 'border-red-300'
              )}
              {...register('title')}
            />
            {errors.title && <p className="text-[11.5px] text-red-500">{errors.title.message}</p>}
          </div>

          {/* Copy */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Copy</label>
            <textarea
              placeholder="Write your post copy here..."
              rows={7}
              className={cn(
                'w-full resize-none rounded-lg border border-[#D9D9D9] bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-neutral-800 placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100',
                errors.copy && 'border-red-300'
              )}
              {...register('copy')}
            />
            {errors.copy && <p className="text-[11.5px] text-red-500">{errors.copy.message}</p>}
          </div>

          {/* Media */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Media</label>
            <MediaUpload
              existingMedia={existingMedia}
              onChange={(file) => setMediaFile(file)}
              onRemoveExisting={() => setRemoveMedia(true)}
              pasteFlash={pasteFlashMain}
            />

            {/* External URL */}
            {!mediaFile && !existingMedia && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-px flex-1 bg-[#E5E5E5]" />
                  <span className="text-[11px] text-neutral-400">O usá un link externo</span>
                  <div className="h-px flex-1 bg-[#E5E5E5]" />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <Link className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <input
                    type="url"
                    value={externalMediaUrl}
                    onChange={(e) => setExternalMediaUrl(e.target.value)}
                    onBlur={(e) => {
                      const raw = e.target.value.trim()
                      if (raw && isExternalVideoUrl(raw)) {
                        setExternalMediaUrl(normalizeVideoUrl(raw))
                      }
                    }}
                    placeholder="Pegá un link de Google Drive, YouTube o Vimeo..."
                    className="w-full rounded-lg border border-[#D9D9D9] bg-white py-2 pl-8 pr-9 text-[12.5px] text-neutral-800 placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUrlHint((v) => !v)}
                    className="absolute inset-y-0 right-2.5 flex items-center text-neutral-300 hover:text-neutral-500 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showUrlHint && (
                  <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-[11.5px] leading-relaxed text-neutral-500">
                    <p className="font-semibold text-neutral-600 mb-1">Cómo compartir desde Google Drive</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Abrí el archivo en Google Drive</li>
                      <li>Hacé clic en <span className="font-medium">Compartir</span></li>
                      <li>Cambiá el acceso a <span className="font-medium">&quot;Cualquier persona con el enlace&quot;</span></li>
                      <li>Copiá el link y pegalo acá</li>
                    </ol>
                  </div>
                )}

                {externalMediaUrl && isExternalVideoUrl(externalMediaUrl) && (
                  <div className="space-y-3">
                    {/* iframe preview */}
                    <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-neutral-50">
                      <div className="flex items-center justify-between border-b border-[#F0F0F0] px-3 py-1.5">
                        <span className="text-[10.5px] font-semibold uppercase tracking-widest text-neutral-400">Vista previa</span>
                        <button
                          type="button"
                          onClick={() => setExternalMediaUrl('')}
                          className="text-[10.5px] text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="aspect-video w-full">
                        <iframe
                          src={externalMediaUrl}
                          className="h-full w-full"
                          allow="autoplay"
                          allowFullScreen
                        />
                      </div>
                    </div>

                    {/* Cover image for thumbnail */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          Portada del video
                        </label>
                        {(coverFile || existingCover) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoverFile(null)
                              setRemoveCover(true)
                            }}
                            className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            Quitar portada
                          </button>
                        )}
                      </div>

                      {coverFile ? (
                        <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-neutral-50">
                          <img
                            src={URL.createObjectURL(coverFile)}
                            alt="Portada"
                            className="aspect-video w-full object-cover"
                          />
                          <div className="flex items-center justify-between border-t border-[#E5E5E5] px-3 py-1.5">
                            <span className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                              {coverFile.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCoverFile(null)}
                              className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                            >
                              Cambiar
                            </button>
                          </div>
                        </div>
                      ) : existingCover ? (
                        <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-neutral-50">
                          <img
                            src={existingCover.url}
                            alt="Portada"
                            className="aspect-video w-full object-cover"
                          />
                          <div className="flex items-center justify-between border-t border-[#E5E5E5] px-3 py-1.5">
                            <span className="text-[11px] text-neutral-400">Portada actual</span>
                            <button
                              type="button"
                              onClick={() => setRemoveCover(false)}
                              className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                              Cambiar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <MediaUpload
                          onChange={(file) => { if (file) setCoverFile(file) }}
                          imagesOnly
                          label="Portada del video"
                          hint="Se usa como thumbnail en el feed"
                          pasteFlash={pasteFlashCover}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="w-64 shrink-0 space-y-6 overflow-y-auto border-l border-[#D9D9D9] px-5 py-6">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</label>
            <Controller
              name="status" control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Scheduled date */}
          {watchedStatus === 'scheduled' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Scheduled for</label>
              <Controller
                name="scheduled_at" control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[13px] text-left transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-400',
                        !field.value && 'text-neutral-400'
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      {field.value ? format(new Date(field.value), 'MMM d, yyyy') : 'Pick a date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => field.onChange(date ? date.toISOString() : null)}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          )}

          {/* Channels */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Channels</label>
            {watchedChannels.map((channelVal, index) => {
              const meta = CHANNELS.find((c) => c.slug === channelVal.slug)
              if (!meta) return null
              return (
                <div key={channelVal.channel_id} className="space-y-1.5">
                  <label className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors',
                    channelVal.enabled
                      ? 'border-[#D9D9D9] bg-[#F2F2F2]'
                      : 'border-[#D9D9D9] hover:border-neutral-400 hover:bg-neutral-50'
                  )}>
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                      channelVal.enabled
                        ? 'border-[#0A0A0A] bg-[#0A0A0A]'
                        : 'border-[#D9D9D9] bg-white'
                    )}>
                      {channelVal.enabled && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      <input
                        type="checkbox" checked={channelVal.enabled}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const updated = [...watchedChannels]
                          updated[index] = { ...updated[index], enabled: e.target.checked }
                          setValue('channels', updated)
                        }}
                        className="sr-only"
                      />
                    </div>
                    <span className={cn('flex items-center gap-1.5 text-[12.5px] font-medium', meta.color)}>
                      <ChannelIcon slug={channelVal.slug} size={13} />
                      {meta.name}
                    </span>
                  </label>

                  {channelVal.enabled && (
                    <div className="space-y-1.5">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-neutral-400 px-0.5">Copy override</p>
                        <textarea
                          placeholder={watchedCopy || 'Same as main copy...'}
                          rows={3}
                          value={channelVal.copy_override}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            const updated = [...watchedChannels]
                            updated[index] = { ...updated[index], copy_override: e.target.value }
                            setValue('channels', updated)
                          }}
                          className="w-full resize-none rounded-md border border-[#D9D9D9] bg-white px-2.5 py-2 text-[12px] leading-relaxed text-neutral-700 placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400 focus:ring-1 focus:ring-neutral-100"
                        />
                      </div>
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-[11px] text-neutral-400 px-0.5">
                          Fecha en {meta.name}
                          <span className="text-neutral-300"> — deja vacío para usar la fecha principal</span>
                        </p>
                        <Popover>
                          <PopoverTrigger
                            className={cn(
                              'flex w-full items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[12px] text-left transition-colors hover:bg-neutral-50 focus:outline-none',
                              !channelVal.channel_scheduled_at && 'text-neutral-400'
                            )}
                          >
                            <CalendarIcon className="h-3 w-3 shrink-0" />
                            {channelVal.channel_scheduled_at
                              ? format(new Date(channelVal.channel_scheduled_at), 'MMM d, yyyy')
                              : watch('scheduled_at')
                                ? `${format(new Date(watch('scheduled_at')!), 'MMM d')} (principal)`
                                : 'Sin fecha'}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={channelVal.channel_scheduled_at ? new Date(channelVal.channel_scheduled_at) : undefined}
                              onSelect={(date: Date | undefined) => {
                                const updated = [...watchedChannels]
                                updated[index] = { ...updated[index], channel_scheduled_at: date ? date.toISOString() : null }
                                setValue('channels', updated)
                              }}
                              autoFocus
                            />
                            {channelVal.channel_scheduled_at && (
                              <div className="border-t border-[#E5E5E5] p-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...watchedChannels]
                                    updated[index] = { ...updated[index], channel_scheduled_at: null }
                                    setValue('channels', updated)
                                  }}
                                  className="w-full rounded-md py-1 text-[11.5px] text-neutral-500 hover:bg-neutral-100 transition-colors"
                                >
                                  Usar fecha principal
                                </button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showPreview && previewPost && (
        <PreviewModal post={previewPost} onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}
