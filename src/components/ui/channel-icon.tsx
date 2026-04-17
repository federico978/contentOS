import { cn } from '@/lib/utils'

interface Props {
  slug: string
  size?: number
  className?: string
  inactive?: boolean
  gray?: boolean
}

export function ChannelIcon({ slug, size = 14, className, inactive = false, gray = false }: Props) {
  const fill = gray ? '#999999' : inactive ? '#CCCCCC' : undefined

  if (slug === 'instagram') {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className={cn('shrink-0', className)}
      >
        {!inactive && !gray && (
          <defs>
            <radialGradient id="ig-bg" cx="30%" cy="107%" r="150%">
              <stop offset="0%"  stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
        )}
        <rect width="24" height="24" rx="6" fill={fill ?? 'url(#ig-bg)'} />
        <rect x="6.5" y="6.5" width="11" height="11" rx="3"
          stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="3"
          stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="16.5" cy="7.5" r="0.9" fill="white" />
      </svg>
    )
  }

  if (slug === 'linkedin') {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className={cn('shrink-0', className)}
      >
        <rect width="24" height="24" rx="4" fill={fill ?? '#0A66C2'} />
        <rect x="7" y="10" width="2.2" height="7" rx="0.4" fill="white" />
        <circle cx="8.1" cy="8.2" r="1.3" fill="white" />
        <path
          d="M11.8 10h2v1c.4-.7 1.3-1.2 2.4-1.2 2 0 2.8 1.4 2.8 3.3V17H17v-3.5c0-.9-.3-1.7-1.3-1.7-1 0-1.6.7-1.6 1.7V17h-2.3V10z"
          fill="white"
        />
      </svg>
    )
  }

  if (slug === 'x') {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className={cn('shrink-0', className)}
      >
        <rect width="24" height="24" rx="4" fill={fill ?? '#000'} />
        <path
          d="M17.3 4.5h-2.6L12 8.6 9.4 4.5H4.7l5.2 7.3-5.3 7.7H7.2l3.2-4.6 3.2 4.6h4.7l-5.5-7.8 4.5-7.2z"
          fill="white"
        />
      </svg>
    )
  }

  return null
}
