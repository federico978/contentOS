'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

const BF_STYLE = {
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
} as const

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

/**
 * Pill-shaped glassmorphism button used for filter toggles and nav selectors.
 *
 * Inactive: frosted white pill
 * Active: dark-tinted pill
 */
export function GlassButton({ active = false, className, style, children, ...props }: GlassButtonProps) {
  return (
    <button
      {...props}
      style={{ ...BF_STYLE, ...style }}
      className={cn(
        'rounded-full transition-all duration-150 cursor-pointer select-none',
        active
          ? 'bg-black/[0.08] border border-black/10 text-[#111111] font-medium'
          : 'bg-white/60 border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[#555555] hover:bg-white/80 hover:text-[#333333]',
        className,
      )}
    >
      {children}
    </button>
  )
}
