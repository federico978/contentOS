'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface VideoThumbnailProps {
  src: string
  className?: string
}

/**
 * Shows the first frame of a video as a static thumbnail.
 * Uses preload="metadata" + seeking to 0.001s to force the browser
 * to paint the first frame without playing the video.
 */
export function VideoThumbnail({ src, className }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function seekToFirstFrame() {
      // A tiny seek forces the browser to decode and paint the first frame
      if (video) video.currentTime = 0.001
    }

    // loadedmetadata fires once dimensions and duration are known
    video.addEventListener('loadedmetadata', seekToFirstFrame)

    // If metadata already loaded (cached video), trigger manually
    if (video.readyState >= 1) seekToFirstFrame()

    return () => {
      video.removeEventListener('loadedmetadata', seekToFirstFrame)
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      preload="metadata"
      muted
      playsInline
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
