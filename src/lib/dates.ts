const TZ = 'America/Argentina/Buenos_Aires'

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
})

/**
 * Returns a local Date whose fields (year/month/day/hour/minute/second)
 * match Argentina wall-clock time. Use this with date-fns format() so
 * the formatted output reflects the correct Argentina date/time.
 */
export function toArDate(isoString: string): Date {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(isoString))
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, parseInt(p.value)])
  )
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}
