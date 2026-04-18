// NOTE: This module must only be imported dynamically (never statically) because
// @react-pdf/renderer accesses browser-only APIs at load time.
import {
  Document, Page, View, Text, Image, Svg, Path,
  StyleSheet,
} from '@react-pdf/renderer'
import { PostWithDetails } from '@/lib/types'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, getDay, isSameDay, format,
} from 'date-fns'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
const BRAND_BLUE = '#0080FF'

const CHANNEL_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  x:         '#111111',
}
const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  x:         'X / Twitter',
}
const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#F5F5F5', color: '#666666', label: 'Draft' },
  scheduled: { bg: '#EBF4FF', color: '#0A66C2', label: 'Scheduled' },
  published: { bg: '#ECFDF5', color: '#059669', label: 'Published' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentPDFProps {
  posts:   PostWithDetails[]
  month:   Date
  channel: string   // 'all' | 'instagram' | 'linkedin' | 'x'
  status:  string   // 'all' | 'draft' | 'scheduled' | 'published'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterPosts(
  posts: PostWithDetails[],
  month: Date,
  channel: string,
  status: string,
): PostWithDetails[] {
  const start = startOfMonth(month)
  const end   = endOfMonth(month)

  return posts.filter((p) => {
    if (status  !== 'all' && p.status !== status) return false
    if (channel !== 'all' && !p.post_channels.some((pc) => pc.channel?.slug === channel)) return false

    const inRange = (d?: string | null) => {
      if (!d) return false
      const t = new Date(d)
      return t >= start && t <= end
    }
    return inRange(p.scheduled_at) || p.post_channels.some((pc) => inRange(pc.scheduled_at))
  })
}

function calendarWeeks(month: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),   { weekStartsOn: 1 }),
  }).filter((d) => getDay(d) !== 0 && getDay(d) !== 6)

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 5) weeks.push(days.slice(i, i + 5))
  return weeks
}

function postsForDay(posts: PostWithDetails[], day: Date): PostWithDetails[] {
  const seen = new Set<string>()
  const out: PostWithDetails[] = []
  posts.forEach((p) => {
    if (seen.has(p.id)) return
    const hit = (d?: string | null) => !!d && isSameDay(new Date(d), day)
    if (hit(p.scheduled_at) || p.post_channels.some((pc) => hit(pc.scheduled_at))) {
      seen.add(p.id)
      out.push(p)
    }
  })
  return out
}

function thumbUrl(post: PostWithDetails): string | null {
  return (
    post.media_files?.find((m) => m.type === 'cover')?.url ??
    post.media_files?.find((m) => m.type === 'image')?.url ??
    null
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Cover
  coverPage:          { fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  coverHeader:        { backgroundColor: BRAND_BLUE, padding: 48, paddingBottom: 52 },
  coverLogoRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  coverLogoLabel:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginLeft: 10 },
  coverTitle:         { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 8 },
  coverPeriod:        { fontSize: 15, color: '#CCEEFF' },
  coverBody:          { padding: 48, paddingTop: 32 },
  coverMetaRow:       { flexDirection: 'row', marginBottom: 28 },
  coverMetaItem:      { marginRight: 28 },
  coverMetaLabel:     { fontSize: 7.5, color: '#999999', marginBottom: 3 },
  coverMetaValue:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0A0A0A' },
  coverDivider:       { height: 1, backgroundColor: '#EEEEEE', marginBottom: 24 },
  coverSummaryHeading:{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0A0A0A', marginBottom: 10 },
  coverSummaryRow:    { flexDirection: 'row' },
  coverCard:          { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 6, padding: 14, alignItems: 'center', marginRight: 10 },
  coverCardLast:      { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 6, padding: 14, alignItems: 'center' },
  coverCardNum:       { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#0A0A0A' },
  coverCardLabel:     { fontSize: 7.5, color: '#777777', marginTop: 4 },

  // Calendar
  calPage:       { padding: 28, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  calTitle:      { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0A0A0A', marginBottom: 12 },
  calHeadRow:    { flexDirection: 'row', marginBottom: 3 },
  calHeadCell:   { flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#AAAAAA', textAlign: 'center', paddingBottom: 3 },
  calRow:        { flexDirection: 'row', marginBottom: 2 },
  calCell:       { flex: 1, minHeight: 60, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 4, padding: 4, marginRight: 2 },
  calCellLast:   { flex: 1, minHeight: 60, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 4, padding: 4 },
  calEmpty:      { flex: 1, marginRight: 2 },
  calEmptyLast:  { flex: 1 },
  calDayNum:     { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#333333', marginBottom: 3 },
  calPill:       { backgroundColor: '#EEF4FF', borderRadius: 2, paddingTop: 1, paddingBottom: 1, paddingLeft: 2, paddingRight: 2, marginBottom: 1.5 },
  calPillText:   { fontSize: 5, color: '#0A0A0A' },
  calMore:       { fontSize: 5, color: '#AAAAAA', marginTop: 1 },

  // Post detail
  detailPage:    { padding: 32, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  detailHeader:  { fontSize: 8, color: '#CCCCCC', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  postCard:      { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 7, overflow: 'hidden', marginBottom: 18 },
  postImg:       { width: '100%', height: 148 },
  postNoImg:     { height: 56, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  postNoImgText: { fontSize: 7.5, color: '#CCCCCC' },
  postBody:      { padding: 14 },
  postTitle:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0A0A0A', marginBottom: 5 },
  postCopy:      { fontSize: 8, color: '#555555', lineHeight: 1.5, marginBottom: 10 },
  postNoCopy:    { fontSize: 8, color: '#BBBBBB', fontFamily: 'Helvetica-Oblique', marginBottom: 10 },
  postMeta:      { flexDirection: 'row', alignItems: 'center' },
  chDot:         { width: 5, height: 5, borderRadius: 3, marginRight: 3 },
  chRow:         { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  chText:        { fontSize: 7, color: '#555555' },
  postDate:      { fontSize: 7, color: '#888888', marginRight: 10 },
  badge:         { borderRadius: 20, paddingTop: 2, paddingBottom: 2, paddingLeft: 7, paddingRight: 7 },
  badgeText:     { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },

  // Footer
  footer:     { position: 'absolute', bottom: 18, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6.5, color: '#CCCCCC' },
})

// ── BigSur Logo (react-pdf SVG) ───────────────────────────────────────────────

function BigSurLogo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 674 674">
      <Path
        // eslint-disable-next-line max-len
        d="M510.237 337.12C510.237 241.109 432.353 163 336.618 163H336.476C336.416 163 336.364 163.03 336.304 163.038C336.237 163.038 336.177 163.038 336.117 163.038C335.937 163.038 335.773 163.068 335.593 163.098C335.548 163.105 335.503 163.113 335.458 163.12C335.406 163.128 335.353 163.158 335.301 163.173C335.294 163.173 335.286 163.173 335.279 163.18C335.271 163.188 335.264 163.18 335.256 163.188C335.159 163.218 335.061 163.24 334.964 163.27C334.77 163.338 334.568 163.338 334.38 163.435C334.238 163.503 334.156 163.631 334.029 163.721C334.029 163.721 334.014 163.721 334.006 163.721C333.991 163.728 333.991 163.743 333.976 163.751C333.894 163.811 333.819 163.878 333.737 163.946C333.737 163.946 333.729 163.946 333.722 163.946C333.714 163.946 333.722 163.946 333.722 163.953C332.614 164.877 332.105 166.28 332.375 167.684C332.39 167.744 332.412 167.804 332.427 167.864C332.449 167.947 332.472 168.022 332.494 168.104C332.494 168.119 332.494 168.127 332.502 168.142C332.569 168.344 332.577 168.562 332.674 168.757C350.524 203.451 332.045 231.148 312.488 260.467C306.373 269.64 300.041 279.12 295.034 288.72C289.189 299.927 289.166 309.768 294.974 315.72C298.028 318.858 301.98 320.179 306.096 321.357C309.726 322.401 313.371 323.406 317.024 324.42C330.406 328.12 344.245 331.941 357.058 337.548C359.064 338.426 361.078 339.334 363.083 340.273C364.476 340.963 365.89 341.609 367.267 342.352C370.448 344.071 373.607 345.835 376.63 347.689C386.3 354.129 393.284 362.378 392.453 374.088C392.004 380.468 389.459 387.321 384.676 395.038C378.097 405.666 370.613 416.032 363.383 426.053C355.3 437.252 346.939 448.842 339.672 460.994C335.855 467.374 328.707 479.407 328.191 491.612C321.934 477.815 324.067 457.917 325.638 443.4L326.132 438.731C327.412 426.233 327.854 410.23 319.875 397.372C317.181 393.033 313.663 389.205 310.258 385.497C304.405 379.125 298.874 373.112 298.709 365.704C298.574 359.563 302.227 353.911 306.089 347.929C307.803 345.279 309.569 342.54 311.051 339.672C312.039 337.766 312.982 335.454 312.481 332.804C311.575 328 306.673 326.026 304.832 325.29C299.181 323.024 293.455 320.922 287.722 318.82C273.277 313.521 258.345 308.049 245.3 299.875C224.313 286.724 207.495 262.261 211.941 238.407C212.166 237.393 212.435 236.38 212.735 235.374C212.982 234.624 213.184 233.873 213.468 233.13C213.505 233.032 213.543 232.935 213.58 232.83C214.119 231.434 214.755 230.045 215.436 228.656C215.818 227.928 216.192 227.193 216.612 226.464C216.649 226.404 216.642 226.337 216.679 226.269C216.941 225.834 217.195 225.399 217.465 224.971C217.562 224.821 217.577 224.64 217.652 224.483C217.884 224.145 218.079 223.807 218.318 223.47C218.52 223.184 218.61 222.869 218.722 222.554C218.872 222.359 219.007 222.156 219.156 221.961C219.463 221.57 219.665 221.128 219.8 220.677C219.867 220.602 219.927 220.52 219.995 220.445C220.376 220.002 220.623 219.499 220.78 218.973L220.833 218.921C221.274 218.455 221.544 217.9 221.709 217.322C223.22 215.798 223.258 213.344 221.768 211.79C220.257 210.214 217.749 210.169 216.185 211.685C181.898 244.817 163 289.366 163 337.12C163 433.041 240.816 511.15 336.454 511.24C432.517 511.008 510.207 432.899 510.207 337.12H510.237Z"
        fill={BRAND_BLUE}
      />
    </Svg>
  )
}

// ── Page footer (repeated per page) ──────────────────────────────────────────

function Footer({ month, label }: { month: Date; label: string }) {
  const docTitle = `BigSur Energy — Plan de Contenido ${MONTHS_ES[month.getMonth()]} ${month.getFullYear()}`
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>{docTitle}</Text>
      <Text style={s.footerText}>{label}</Text>
    </View>
  )
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({ posts, month, channel, status }: ContentPDFProps & { posts: PostWithDetails[] }) {
  const monthLabel   = `${MONTHS_ES[month.getMonth()]} ${month.getFullYear()}`
  const channelLabel = channel === 'all' ? 'Todos los canales' : CHANNEL_LABELS[channel] ?? channel
  const statusLabel  = status  === 'all' ? 'Todos los estados' : STATUS_CONFIG[status]?.label ?? status

  const countIG = posts.filter((p) => p.post_channels.some((pc) => pc.channel?.slug === 'instagram')).length
  const countLI = posts.filter((p) => p.post_channels.some((pc) => pc.channel?.slug === 'linkedin')).length
  const countX  = posts.filter((p) => p.post_channels.some((pc) => pc.channel?.slug === 'x')).length

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Blue header */}
      <View style={s.coverHeader}>
        <View style={s.coverLogoRow}>
          <BigSurLogo size={34} />
          <Text style={s.coverLogoLabel}>BigSur Energy</Text>
        </View>
        <Text style={s.coverTitle}>Plan de Contenido</Text>
        <Text style={s.coverPeriod}>{monthLabel}</Text>
      </View>

      {/* Body */}
      <View style={s.coverBody}>
        {/* Filters meta */}
        <View style={s.coverMetaRow}>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>CANAL</Text>
            <Text style={s.coverMetaValue}>{channelLabel}</Text>
          </View>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>ESTADO</Text>
            <Text style={s.coverMetaValue}>{statusLabel}</Text>
          </View>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>TOTAL DE POSTS</Text>
            <Text style={s.coverMetaValue}>{posts.length}</Text>
          </View>
        </View>

        <View style={s.coverDivider} />

        {/* Summary by channel */}
        <Text style={s.coverSummaryHeading}>RESUMEN POR CANAL</Text>
        <View style={s.coverSummaryRow}>
          <View style={[s.coverCard, { borderTopWidth: 3, borderTopColor: CHANNEL_COLORS.instagram }]}>
            <Text style={s.coverCardNum}>{countIG}</Text>
            <Text style={s.coverCardLabel}>Instagram</Text>
          </View>
          <View style={[s.coverCard, { borderTopWidth: 3, borderTopColor: CHANNEL_COLORS.linkedin }]}>
            <Text style={s.coverCardNum}>{countLI}</Text>
            <Text style={s.coverCardLabel}>LinkedIn</Text>
          </View>
          <View style={[s.coverCardLast, { borderTopWidth: 3, borderTopColor: '#111111' }]}>
            <Text style={s.coverCardNum}>{countX}</Text>
            <Text style={s.coverCardLabel}>X / Twitter</Text>
          </View>
        </View>
      </View>

      <Footer month={month} label="Portada" />
    </Page>
  )
}

// ── Calendar page ─────────────────────────────────────────────────────────────

function CalendarPage({ posts, month }: { posts: PostWithDetails[]; month: Date }) {
  const weeks     = calendarWeeks(month)
  const monthLabel = `${MONTHS_ES[month.getMonth()]} ${month.getFullYear()}`
  const mStart    = startOfMonth(month)
  const mEnd      = endOfMonth(month)

  return (
    <Page size="A4" style={s.calPage}>
      <Text style={s.calTitle}>Calendario — {monthLabel}</Text>

      {/* Weekday headers */}
      <View style={s.calHeadRow}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} style={s.calHeadCell}>{d}</Text>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <View key={wi} style={s.calRow}>
          {week.map((day, di) => {
            const inMonth  = day >= mStart && day <= mEnd
            const isLast   = di === 4
            const cellSt   = inMonth ? (isLast ? s.calCellLast : s.calCell) : (isLast ? s.calEmptyLast : s.calEmpty)
            const dayPosts = inMonth ? postsForDay(posts, day) : []

            return (
              <View key={di} style={cellSt}>
                {inMonth && (
                  <>
                    <Text style={s.calDayNum}>{format(day, 'd')}</Text>
                    {dayPosts.slice(0, 3).map((p) => (
                      <View key={p.id} style={s.calPill}>
                        <Text style={s.calPillText}>
                          {p.title || 'Sin título'}
                        </Text>
                      </View>
                    ))}
                    {dayPosts.length > 3 && (
                      <Text style={s.calMore}>+{dayPosts.length - 3} más</Text>
                    )}
                  </>
                )}
              </View>
            )
          })}
        </View>
      ))}

      <Footer month={month} label="Calendario" />
    </Page>
  )
}

// ── Post detail pages (2 per page) ───────────────────────────────────────────

function PostDetailPages({ posts, month }: { posts: PostWithDetails[]; month: Date }) {
  const pages: PostWithDetails[][] = []
  for (let i = 0; i < posts.length; i += 2) pages.push(posts.slice(i, i + 2))

  return (
    <>
      {pages.map((pagePosts, pi) => (
        <Page key={pi} size="A4" style={s.detailPage}>
          <Text style={s.detailHeader}>
            BigSur Energy — Plan de Contenido {MONTHS_ES[month.getMonth()]} {month.getFullYear()}
          </Text>

          {pagePosts.map((post) => {
            const thumb   = thumbUrl(post)
            const date    = post.post_channels[0]?.scheduled_at ?? post.scheduled_at
            const stCfg   = STATUS_CONFIG[post.status]

            return (
              <View key={post.id} style={s.postCard}>
                {/* Thumbnail */}
                {thumb ? (
                  <Image src={thumb} style={s.postImg} />
                ) : (
                  <View style={s.postNoImg}>
                    <Text style={s.postNoImgText}>Sin imagen</Text>
                  </View>
                )}

                {/* Content */}
                <View style={s.postBody}>
                  <Text style={s.postTitle}>{post.title || 'Sin título'}</Text>

                  {post.copy ? (
                    <Text style={s.postCopy}>{post.copy}</Text>
                  ) : (
                    <Text style={s.postNoCopy}>Sin copy</Text>
                  )}

                  {/* Meta row */}
                  <View style={s.postMeta}>
                    {/* Channel dots */}
                    {post.post_channels.slice(0, 3).map((pc) => {
                      if (!pc.channel?.slug) return null
                      return (
                        <View key={pc.id} style={s.chRow}>
                          <View style={[s.chDot, { backgroundColor: CHANNEL_COLORS[pc.channel.slug] ?? '#999' }]} />
                          <Text style={s.chText}>{CHANNEL_LABELS[pc.channel.slug] ?? pc.channel.slug}</Text>
                        </View>
                      )
                    })}

                    {/* Date */}
                    {date && (
                      <Text style={s.postDate}>
                        {new Date(date).toLocaleDateString('es-AR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </Text>
                    )}

                    {/* Status badge */}
                    {stCfg && (
                      <View style={[s.badge, { backgroundColor: stCfg.bg }]}>
                        <Text style={[s.badgeText, { color: stCfg.color }]}>{stCfg.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )
          })}

          <Footer
            month={month}
            label={`Posts ${pi * 2 + 1}–${Math.min(pi * 2 + 2, posts.length)} de ${posts.length}`}
          />
        </Page>
      ))}
    </>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function buildContentPDF(props: ContentPDFProps) {
  const filtered = filterPosts(props.posts, props.month, props.channel, props.status)
  const monthLabel = `${MONTHS_ES[props.month.getMonth()]} ${props.month.getFullYear()}`

  return (
    <Document title={`Plan de Contenido — ${monthLabel}`} author="BigSur Energy">
      <CoverPage   {...props} posts={filtered} />
      <CalendarPage posts={filtered} month={props.month} />
      <PostDetailPages posts={filtered} month={props.month} />
    </Document>
  )
}
