'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Download, ImageIcon, VideoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaFile } from '@/lib/types'

interface MediaUploadProps {
  existingMedia?: MediaFile | null
  onChange: (file: File | null) => void
  onRemoveExisting?: () => void
  /** Restrict accept to images only (no video). Default: false */
  imagesOnly?: boolean
  /** Override the upload label. Default: 'Upload image or video' */
  label?: string
  /** Override the sub-hint. */
  hint?: string
  /** When true, ring the dropzone border briefly (paste flash). Default: false */
  pasteFlash?: boolean
}

export function MediaUpload({
  existingMedia,
  onChange,
  onRemoveExisting,
  imagesOnly = false,
  label,
  hint,
  pasteFlash = false,
}: MediaUploadProps) {
  const [preview, setPreview]       = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const accept: Record<string, string[]> = imagesOnly
    ? { 'image/*': [] }
    : { 'image/*': [], 'video/*': [] }

  function acceptFile(file: File) {
    setPendingFile(file)
    onChange(file)
    setPreview(URL.createObjectURL(file))
  }

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (file) acceptFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, maxFiles: 1, maxSize: 100 * 1024 * 1024,
  })

  function handleDivPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (file) acceptFile(file)
  }

  function handleRemovePending() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null); setPendingFile(null); onChange(null)
  }

  async function handleDownload(url: string, filename: string) {
    const blob = await (await fetch(url)).blob()
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  if (existingMedia && !preview) {
    const isVideo  = existingMedia.type === 'video'
    const filename = existingMedia.url.split('/').pop() || 'media'
    return (
      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-neutral-50">
        {isVideo
          ? <video src={existingMedia.url} className="aspect-video w-full object-cover" controls />
          : <img src={existingMedia.url} alt="Media" className="aspect-video w-full object-cover" />
        }
        <div className="flex items-center justify-between border-t border-[#E5E5E5] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11.5px] text-neutral-400">
            {isVideo ? <VideoIcon className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            {formatBytes(existingMedia.size_bytes)}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => handleDownload(existingMedia.url, filename)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-neutral-500 hover:bg-neutral-100 transition-colors">
              <Download className="h-3 w-3" /> Download
            </button>
            <button type="button" onClick={onRemoveExisting}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-red-500 hover:bg-red-50 transition-colors">
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (preview && pendingFile) {
    const isVideo = pendingFile.type.startsWith('video')
    return (
      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-neutral-50">
        {isVideo
          ? <video src={preview} className="aspect-video w-full object-cover" controls />
          : <img src={preview} alt="Preview" className="aspect-video w-full object-cover" />
        }
        <div className="flex items-center justify-between border-t border-[#E5E5E5] px-3 py-2">
          <span className="text-[11.5px] text-neutral-400 truncate max-w-[200px]">
            {pendingFile.name} · {formatBytes(pendingFile.size)}
          </span>
          <button type="button" onClick={handleRemovePending}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-red-500 hover:bg-red-50 transition-colors">
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>
    )
  }

  const defaultLabel = imagesOnly ? 'Upload image' : 'Upload image or video'
  const defaultHint  = imagesOnly ? 'Drag & drop, click or paste — up to 100 MB' : 'Drag & drop, click or paste — up to 100 MB'

  return (
    <div
      {...getRootProps()}
      onPaste={handleDivPaste}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all',
        isDragActive
          ? 'border-violet-400 bg-violet-50/50'
          : pasteFlash
            ? 'border-violet-400 bg-violet-50/40 ring-2 ring-violet-300/60'
            : 'border-[#E5E5E5] hover:border-violet-300 hover:bg-violet-50/30'
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        isDragActive || pasteFlash ? 'bg-violet-100' : 'bg-neutral-100'
      )}>
        <Upload className={cn('h-4 w-4', isDragActive || pasteFlash ? 'text-violet-500' : 'text-neutral-400')} />
      </div>
      <div>
        <p className="text-[13px] font-medium text-neutral-600">
          {isDragActive ? 'Drop to upload' : (label ?? defaultLabel)}
        </p>
        <p className="mt-0.5 text-[12px] text-neutral-400">{hint ?? defaultHint}</p>
      </div>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
