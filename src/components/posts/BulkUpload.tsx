'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  X, Upload, ChevronRight, ChevronLeft, Check, Loader2, Copy as CopyIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { createPost, fetchChannels } from '@/lib/api/posts'
import { usePostStore } from '@/store/usePostStore'
import { Channel, ChannelSlug, PostStatus } from '@/lib/types'
import { CHANNELS } from '@/lib/constants'
import { ChannelIcon } from '@/components/ui/channel-icon'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── Internal types ────────────────────────────────────────────────────────────
interface BulkFile {
  id: string
  file: File
  url: string
  isVideo: boolean
}

interface RowData {
  fileId: string
  title: string
  copy: string
  channelIds: string[]
  date: string          // "YYYY-MM-DD" or empty
  status: PostStatus
}

// ── Sub-component: single edit row ────────────────────────────────────────────
function EditRow({
  row,
  index,
  fileObj,
  allChannels,
  onUpdate,
  onToggleChannel,
  onCopyPrevious,
}: {
  row: RowData
  index: number
  fileObj: BulkFile | undefined
  allChannels: Channel[]
  onUpdate: (patch: Partial<RowData>) => void
  onToggleChannel: (channelId: string) => void
  onCopyPrevious?: () => void
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-[#D9D9D9] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {/* Row number */}
      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-400">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#D9D9D9] bg-neutral-50">
        {fileObj ? (
          fileObj.isVideo
            ? <video src={fileObj.url} className="h-full w-full object-cover" preload="metadata" muted />
            : <img src={fileObj.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}
      </div>

      {/* Title + Copy */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <input
          value={row.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del post..."
          className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400"
        />
        <textarea
          value={row.copy}
          onChange={(e) => onUpdate({ copy: e.target.value })}
          placeholder="Copy del post..."
          rows={3}
          className="w-full resize-none rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-neutral-700 placeholder:text-neutral-300 outline-none transition-colors focus:border-neutral-400"
        />
      </div>

      {/* Right panel: channels, date, status */}
      <div className="flex w-52 shrink-0 flex-col gap-2.5">
        {/* Channels */}
        <div>
          <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
            Canales
          </p>
          <div className="space-y-1">
            {allChannels.map((ch) => {
              const meta    = CHANNELS.find((c) => c.slug === ch.slug)
              const enabled = row.channelIds.includes(ch.id)
              return (
                <label
                  key={ch.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 transition-colors',
                    enabled
                      ? 'border-neutral-300 bg-neutral-50'
                      : 'border-[#D9D9D9] hover:bg-neutral-50'
                  )}
                >
                  <div className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                    enabled ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D9D9D9]'
                  )}>
                    {enabled && <Check className="h-2 w-2 text-white" strokeWidth={3.5} />}
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => onToggleChannel(ch.id)}
                      className="sr-only"
                    />
                  </div>
                  <ChannelIcon slug={ch.slug} size={12} />
                  <span className={cn('text-[11.5px] font-medium', meta?.color)}>
                    {ch.name}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div>
          <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
            Fecha
          </p>
          <input
            type="date"
            value={row.date}
            onChange={(e) => onUpdate({
              date:   e.target.value,
              status: e.target.value ? 'scheduled' : row.status,
            })}
            className="w-full rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none transition-colors focus:border-neutral-400"
          />
        </div>

        {/* Status */}
        <div>
          <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
            Estado
          </p>
          <select
            value={row.status}
            onChange={(e) => onUpdate({ status: e.target.value as PostStatus })}
            className="w-full rounded-md border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none transition-colors focus:border-neutral-400 cursor-pointer"
          >
            <option value="draft">Borrador</option>
            <option value="scheduled">Programado</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        {/* Copy from previous */}
        {onCopyPrevious && (
          <button
            onClick={onCopyPrevious}
            className="flex items-center gap-1.5 rounded-md border border-[#D9D9D9] px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600"
          >
            <CopyIcon className="h-3 w-3" />
            Igual que el anterior
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function BulkUpload({ onClose }: { onClose: () => void }) {
  const router   = useRouter()
  const { addPost, channels: storeChannels } = usePostStore()

  const [step,        setStep]        = useState<'upload' | 'edit' | 'saving'>('upload')
  const [files,       setFiles]       = useState<BulkFile[]>([])
  const [rows,        setRows]        = useState<RowData[]>([])
  const [allChannels, setAllChannels] = useState<Channel[]>(storeChannels)
  const [userId,      setUserId]      = useState('')
  const [savedCount,  setSavedCount]  = useState(0)
  const [errorIds,    setErrorIds]    = useState<Set<string>>(new Set())

  // Init
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      if (storeChannels.length === 0) {
        const c = await fetchChannels()
        setAllChannels(c)
      }
    }
    init()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [storeChannels])

  // Escape → close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const next: BulkFile[] = accepted.map((file) => ({
      id:      crypto.randomUUID(),
      file,
      url:     URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/'),
    }))
    setFiles((prev) => [...prev, ...next])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    multiple: true,
  })

  function removeFile(id: string) {
    setFiles((prev) => {
      const f = prev.find((f) => f.id === id)
      if (f) URL.revokeObjectURL(f.url)
      return prev.filter((f) => f.id !== id)
    })
  }

  function goToEdit() {
    setRows(files.map((f) => ({
      fileId:     f.id,
      title:      f.file.name.replace(/\.[^/.]+$/, ''),
      copy:       '',
      channelIds: [],
      date:       '',
      status:     'draft',
    })))
    setStep('edit')
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  function updateRow(fileId: string, patch: Partial<RowData>) {
    setRows((prev) => prev.map((r) => r.fileId === fileId ? { ...r, ...patch } : r))
  }

  function toggleChannel(fileId: string, channelId: string) {
    setRows((prev) => prev.map((r) => {
      if (r.fileId !== fileId) return r
      const has = r.channelIds.includes(channelId)
      return { ...r, channelIds: has ? r.channelIds.filter((id) => id !== channelId) : [...r.channelIds, channelId] }
    }))
  }

  function copyFromPrevious(index: number) {
    if (index === 0) return
    const prev = rows[index - 1]
    setRows((r) => r.map((row, i) =>
      i === index
        ? { ...row, channelIds: prev.channelIds, date: prev.date, status: prev.status }
        : row
    ))
  }

  // ── Step 3 ───────────────────────────────────────────────────────────────────
  async function saveAll() {
    if (!userId) return
    setStep('saving')
    setSavedCount(0)
    const errors = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row     = rows[i]
      const fileObj = files.find((f) => f.id === row.fileId)

      try {
        const formData = {
          title:              row.title || `Post ${i + 1}`,
          copy:               row.copy,
          status:             row.status,
          scheduled_at:       row.date ? new Date(row.date + 'T12:00:00').toISOString() : null,
          external_media_url: null,
          channels:           allChannels.map((ch) => ({
            channel_id:    ch.id,
            slug:          ch.slug as ChannelSlug,
            enabled:       row.channelIds.includes(ch.id),
            copy_override: '',
          })),
        }
        const created = await createPost(formData, userId, fileObj?.file)
        addPost(created)
      } catch {
        errors.add(row.fileId)
      }

      setSavedCount(i + 1)
    }

    setErrorIds(errors)

    if (errors.size === 0) {
      toast.success(`${rows.length} ${rows.length === 1 ? 'post guardado' : 'posts guardados'}`)
      onClose()
      router.push('/posts')
    } else {
      toast.error(`${errors.size} ${errors.size === 1 ? 'post falló' : 'posts fallaron'}`)
    }
  }

  const progress    = rows.length > 0 ? (savedCount / rows.length) * 100 : 0
  const doneStep3   = step === 'saving' && savedCount === rows.length

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-4">
          {/* Close */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>

          <h1 className="text-[14px] font-black text-[#0A0A0A]">Carga masiva</h1>

          {/* Step breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11.5px]">
            {(['upload', 'edit', 'saving'] as const).map((s, i) => {
              const labels = ['1. Archivos', '2. Información', '3. Guardar']
              const past   = ['upload','edit','saving'].indexOf(step) > i
              const active = step === s
              return (
                <span key={s} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-neutral-300" />}
                  <span className={cn(
                    'font-medium',
                    active ? 'text-[#0A0A0A]' : past ? 'text-neutral-400' : 'text-neutral-300'
                  )}>
                    {labels[i]}
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {step === 'upload' && (
            <button
              onClick={goToEdit}
              disabled={files.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:-translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar con {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {step === 'edit' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-1 rounded-md border border-[#D9D9D9] px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Volver
              </button>
              <button
                onClick={saveAll}
                className="flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:-translate-y-px"
              >
                <Check className="h-3.5 w-3.5" />
                Guardar {rows.length} {rows.length === 1 ? 'post' : 'posts'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto bg-[#F8F8F8]">

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="mx-auto max-w-3xl px-6 py-10">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-20 transition-all',
                isDragActive
                  ? 'border-[#0A0A0A] bg-neutral-100'
                  : 'border-[#D9D9D9] bg-white hover:border-neutral-400 hover:bg-neutral-50'
              )}
            >
              <input {...getInputProps()} />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <Upload className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="mt-5 text-[15px] font-bold text-neutral-800">
                {isDragActive ? 'Soltá los archivos aquí' : 'Arrastrá tus archivos aquí'}
              </p>
              <p className="mt-1.5 text-[13px] text-neutral-400">
                O hacé click para seleccionar · Imágenes y videos · Múltiples archivos
              </p>
            </div>

            {/* File thumbnails grid */}
            {files.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  {files.length} {files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
                </p>
                <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-[#D9D9D9] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                    >
                      {f.isVideo
                        ? <video src={f.url} className="h-full w-full object-cover" preload="metadata" muted />
                        : <img src={f.url} alt={f.file.name} className="h-full w-full object-cover" />
                      }
                      {/* Video badge */}
                      {f.isVideo && (
                        <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">
                          VID
                        </div>
                      )}
                      {/* Remove */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Edit rows ── */}
        {step === 'edit' && (
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="space-y-2">
              {rows.map((row, index) => (
                <EditRow
                  key={row.fileId}
                  row={row}
                  index={index}
                  fileObj={files.find((f) => f.id === row.fileId)}
                  allChannels={allChannels}
                  onUpdate={(patch) => updateRow(row.fileId, patch)}
                  onToggleChannel={(chId) => toggleChannel(row.fileId, chId)}
                  onCopyPrevious={index > 0 ? () => copyFromPrevious(index) : undefined}
                />
              ))}
            </div>
            {/* Bottom action (duplicate of header for long lists) */}
            <div className="sticky bottom-0 mt-4 flex justify-end border-t border-[#D9D9D9] bg-[#F8F8F8] py-4">
              <button
                onClick={saveAll}
                className="flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:-translate-y-px"
              >
                <Check className="h-3.5 w-3.5" />
                Guardar {rows.length} {rows.length === 1 ? 'post' : 'posts'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Saving ── */}
        {step === 'saving' && (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-12">
            <div className="w-full max-w-sm">
              <p className="mb-3 text-center text-[14px] font-bold text-neutral-800">
                {doneStep3
                  ? errorIds.size === 0
                    ? `¡Listo! ${rows.length} ${rows.length === 1 ? 'post guardado' : 'posts guardados'}`
                    : `Completado con ${errorIds.size} ${errorIds.size === 1 ? 'error' : 'errores'}`
                  : `Guardando post ${savedCount + 1} de ${rows.length}…`
                }
              </p>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-[#0A0A0A] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[11.5px] text-neutral-400">
                {savedCount} de {rows.length} completados
              </p>

              {/* Row status list */}
              <div className="mt-6 space-y-1.5">
                {rows.map((row, i) => {
                  const done  = i < savedCount
                  const error = errorIds.has(row.fileId)
                  const active = i === savedCount && !doneStep3
                  return (
                    <div
                      key={row.fileId}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] transition-colors',
                        error   ? 'border-red-200 bg-red-50 text-red-600'
                        : done  ? 'border-[#D9D9D9] bg-white text-neutral-500'
                        : active ? 'border-neutral-300 bg-white text-neutral-700'
                        : 'border-transparent bg-transparent text-neutral-300'
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {error  ? <X className="h-3.5 w-3.5 text-red-500" />
                        : done  ? <Check className="h-3.5 w-3.5 text-neutral-400" />
                        : active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                        : <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />}
                      </span>
                      <span className="truncate font-medium">
                        {row.title || `Post ${i + 1}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
