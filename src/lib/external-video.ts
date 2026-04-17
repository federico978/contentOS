/**
 * Utilities for handling external video URLs (Google Drive, YouTube, Vimeo).
 * All functions are pure — no side-effects, safe to call anywhere.
 */

export type VideoProvider = 'gdrive' | 'youtube' | 'vimeo' | 'other'

// ── Regex patterns ────────────────────────────────────────────────────────────
const RE_GDRIVE_FILE = /\/file\/d\/([a-zA-Z0-9_-]+)/
const RE_GDRIVE_OPEN = /[?&]id=([a-zA-Z0-9_-]+)/
const RE_YT_WATCH    = /[?&]v=([a-zA-Z0-9_-]+)/
const RE_YT_SHORT    = /youtu\.be\/([a-zA-Z0-9_-]+)/
const RE_VIMEO_ID    = /vimeo\.com\/(\d+)/

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true when the URL looks like a supported external video source. */
export function isExternalVideoUrl(url: string): boolean {
  if (!url) return false
  return (
    url.includes('drive.google.com') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')
  )
}

/** Returns the video provider for a URL. */
export function getVideoProvider(url: string): VideoProvider {
  if (url.includes('drive.google.com')) return 'gdrive'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('vimeo.com')) return 'vimeo'
  return 'other'
}

/**
 * Converts any supported video URL to its embeddable form.
 * Returns the original URL unchanged if the format is not recognised.
 *
 * Google Drive  → https://drive.google.com/file/d/FILE_ID/preview
 * YouTube       → https://www.youtube.com/embed/VIDEO_ID
 * Vimeo         → https://player.vimeo.com/video/VIDEO_ID
 */
export function normalizeVideoUrl(raw: string): string {
  const url = raw.trim()
  if (!url) return url

  // Google Drive
  if (url.includes('drive.google.com')) {
    const id =
      RE_GDRIVE_FILE.exec(url)?.[1] ??
      RE_GDRIVE_OPEN.exec(url)?.[1]
    if (id) return `https://drive.google.com/file/d/${id}/preview`
    return url
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const id =
      RE_YT_WATCH.exec(url)?.[1] ??
      RE_YT_SHORT.exec(url)?.[1]
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`
    return url
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const id = RE_VIMEO_ID.exec(url)?.[1]
    if (id) return `https://player.vimeo.com/video/${id}`
    return url
  }

  return url
}

/**
 * Returns a static thumbnail <img> URL for a Google Drive video URL.
 * Works with both the original share URL and the already-normalised /preview URL.
 * Returns null if the URL is not a recognisable Google Drive file URL.
 */
export function getGDriveThumbnailUrl(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null
  const id =
    RE_GDRIVE_FILE.exec(url)?.[1] ??
    RE_GDRIVE_OPEN.exec(url)?.[1]
  if (!id) return null
  return `https://drive.google.com/thumbnail?id=${id}&sz=w800`
}

/** Human-readable label for each provider. */
export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  gdrive:  'Google Drive',
  youtube: 'YouTube',
  vimeo:   'Vimeo',
  other:   'Video externo',
}
