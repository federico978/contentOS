'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Mail, X as XIcon } from 'lucide-react'
import { INBOX_DATA, InboxEntry, CanalType, CategoriaType, PrioridadType, EstadoType } from '@/lib/data/inbox'
import { cn } from '@/lib/utils'

// ── Label maps ─────────────────────────────────────────────────────────────────

const CATEGORIA_LABEL: Record<CategoriaType, string> = {
  hiring: 'Hiring', investor: 'Investor', partnership: 'Partnership',
  sales: 'Sales', media: 'Media', general: 'General',
}

const CATEGORIA_STYLE: Record<CategoriaType, string> = {
  hiring:      'bg-blue-50    text-blue-700    border border-blue-100',
  investor:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  partnership: 'bg-violet-50  text-violet-700  border border-violet-100',
  sales:       'bg-orange-50  text-orange-700  border border-orange-100',
  media:       'bg-rose-50    text-rose-700    border border-rose-100',
  general:     'bg-neutral-100 text-neutral-600 border border-neutral-200',
}

const PRIORIDAD_LABEL: Record<PrioridadType, string> = {
  high: 'Alta', medium: 'Media', low: 'Baja',
}

const PRIORIDAD_DOT: Record<PrioridadType, string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-neutral-300',
}

const PRIORIDAD_TEXT: Record<PrioridadType, string> = {
  high: 'text-red-600', medium: 'text-amber-600', low: 'text-neutral-500',
}

const ESTADO_LABEL: Record<EstadoType, string> = {
  pendiente: 'Pendiente', en_curso: 'En curso',
  respondido: 'Respondido', descartado: 'Descartado',
}

const ESTADO_STYLE: Record<EstadoType, string> = {
  pendiente:   'bg-neutral-100 text-neutral-600',
  en_curso:    'bg-sky-50 text-sky-700',
  respondido:  'bg-emerald-50 text-emerald-700',
  descartado:  'bg-neutral-100 text-neutral-400 line-through',
}

const PRIORIDAD_ORDER: Record<PrioridadType, number> = { high: 3, medium: 2, low: 1 }

// ── Filter options ─────────────────────────────────────────────────────────────

type SortKey = 'fecha-desc' | 'fecha-asc' | 'prioridad'

interface Filters {
  canal:     CanalType | ''
  categoria: CategoriaType | ''
  prioridad: PrioridadType | ''
  estado:    EstadoType | ''
}

const EMPTY_FILTERS: Filters = { canal: '', categoria: '', prioridad: '', estado: '' }

// ── Main component ─────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [filters,        setFilters]        = useState<Filters>(EMPTY_FILTERS)
  const [sortKey,        setSortKey]        = useState<SortKey>('fecha-desc')
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [statusOverride, setStatusOverride] = useState<Record<string, EstadoType>>({})

  function getEstado(entry: InboxEntry): EstadoType {
    return statusOverride[entry.id] ?? entry.estado
  }

  function updateEstado(id: string, estado: EstadoType) {
    setStatusOverride((prev) => ({ ...prev, [id]: estado }))
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  const entries = useMemo(() => {
    let data = INBOX_DATA.map((e) => ({ ...e, estadoActual: getEstado(e) }))

    // Apply filters
    if (filters.canal)     data = data.filter((e) => e.canal     === filters.canal)
    if (filters.categoria) data = data.filter((e) => e.categoria === filters.categoria)
    if (filters.prioridad) data = data.filter((e) => e.prioridad === filters.prioridad)
    if (filters.estado)    data = data.filter((e) => e.estadoActual === filters.estado)

    // Sort
    data.sort((a, b) => {
      if (sortKey === 'fecha-desc') return b.dateISO.localeCompare(a.dateISO)
      if (sortKey === 'fecha-asc')  return a.dateISO.localeCompare(b.dateISO)
      // prioridad: high first, then fecha-desc
      const pd = PRIORIDAD_ORDER[b.prioridad] - PRIORIDAD_ORDER[a.prioridad]
      if (pd !== 0) return pd
      return b.dateISO.localeCompare(a.dateISO)
    })

    return data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortKey, statusOverride])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F2F2F2]">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[#D9D9D9] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-[#0A0A0A]">Inbox</h1>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
              {entries.length} / {INBOX_DATA.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-[#D9D9D9] bg-white px-6 py-2.5">

        {/* Canal */}
        <FilterSelect
          label="Canal"
          value={filters.canal}
          onChange={(v) => setFilters((f) => ({ ...f, canal: v as CanalType | '' }))}
          options={[
            { value: 'email',    label: 'Email' },
            { value: 'linkedin', label: 'LinkedIn' },
          ]}
        />

        {/* Categoría */}
        <FilterSelect
          label="Categoría"
          value={filters.categoria}
          onChange={(v) => setFilters((f) => ({ ...f, categoria: v as CategoriaType | '' }))}
          options={[
            { value: 'hiring',      label: 'Hiring' },
            { value: 'investor',    label: 'Investor' },
            { value: 'partnership', label: 'Partnership' },
            { value: 'sales',       label: 'Sales' },
            { value: 'media',       label: 'Media' },
            { value: 'general',     label: 'General' },
          ]}
        />

        {/* Prioridad */}
        <FilterSelect
          label="Prioridad"
          value={filters.prioridad}
          onChange={(v) => setFilters((f) => ({ ...f, prioridad: v as PrioridadType | '' }))}
          options={[
            { value: 'high',   label: 'Alta' },
            { value: 'medium', label: 'Media' },
            { value: 'low',    label: 'Baja' },
          ]}
        />

        {/* Estado */}
        <FilterSelect
          label="Estado"
          value={filters.estado}
          onChange={(v) => setFilters((f) => ({ ...f, estado: v as EstadoType | '' }))}
          options={[
            { value: 'pendiente',  label: 'Pendiente' },
            { value: 'en_curso',   label: 'En curso' },
            { value: 'respondido', label: 'Respondido' },
            { value: 'descartado', label: 'Descartado' },
          ]}
        />

        <div className="mx-1 h-4 w-px bg-[#D9D9D9]" />

        {/* Sort */}
        <FilterSelect
          label="Ordenar"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={[
            { value: 'fecha-desc', label: 'Fecha ↓' },
            { value: 'fecha-asc',  label: 'Fecha ↑' },
            { value: 'prioridad',  label: 'Prioridad' },
          ]}
          noAll
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md border border-[#D9D9D9] bg-white px-2 py-1 text-[11.5px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
          >
            <XIcon className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {entries.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[13px] text-neutral-400">
            Sin resultados para los filtros aplicados
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D9D9D9] bg-white shadow-sm">

            {/* Table head */}
            <div className="grid grid-cols-[90px_72px_1fr_2fr_100px_72px_126px_32px] items-center gap-3 border-b border-[#E8E8E8] bg-neutral-50 px-4 py-2">
              {['Fecha', 'Canal', 'Contacto', 'Resumen', 'Categoría', 'Prior.', 'Estado', ''].map((h) => (
                <span key={h} className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {entries.map((entry) => {
              const expanded   = expandedId === entry.id
              const estadoNow  = entry.estadoActual

              return (
                <div key={entry.id} className="border-b border-[#F0F0F0] last:border-0">

                  {/* Main row */}
                  <div
                    onClick={() => toggleExpand(entry.id)}
                    className={cn(
                      'grid grid-cols-[90px_72px_1fr_2fr_100px_72px_126px_32px] cursor-pointer items-start gap-3 px-4 py-3 transition-colors',
                      expanded ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                    )}
                  >
                    {/* Fecha */}
                    <span className="text-[12px] text-neutral-500 tabular-nums">{entry.fecha}</span>

                    {/* Canal */}
                    <div className="flex items-center gap-1">
                      {entry.canal === 'email' ? (
                        <Mail className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.75} />
                      ) : (
                        <LinkedInIcon />
                      )}
                      <span className="text-[11px] text-neutral-400 capitalize">{entry.canal}</span>
                    </div>

                    {/* Contacto */}
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-[#0A0A0A]">{entry.nombre}</p>
                      {entry.empresa !== 'no disponible' && (
                        <p className="truncate text-[11px] text-neutral-400">{entry.empresa}</p>
                      )}
                      {entry.cargo !== 'no disponible' && (
                        <p className="truncate text-[11px] text-neutral-400 italic">{entry.cargo}</p>
                      )}
                    </div>

                    {/* Resumen */}
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-neutral-600">
                      {entry.resumen}
                    </p>

                    {/* Categoría */}
                    <span className={cn(
                      'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                      CATEGORIA_STYLE[entry.categoria]
                    )}>
                      {CATEGORIA_LABEL[entry.categoria]}
                    </span>

                    {/* Prioridad */}
                    <div className="flex items-center gap-1">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORIDAD_DOT[entry.prioridad])} />
                      <span className={cn('text-[11.5px] font-medium', PRIORIDAD_TEXT[entry.prioridad])}>
                        {PRIORIDAD_LABEL[entry.prioridad]}
                      </span>
                    </div>

                    {/* Estado */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={estadoNow}
                        onChange={(e) => updateEstado(entry.id, e.target.value as EstadoType)}
                        className={cn(
                          'w-full cursor-pointer rounded-md border border-transparent px-2 py-1 text-[11.5px] font-medium outline-none transition-colors hover:border-[#D9D9D9] focus:border-neutral-400',
                          ESTADO_STYLE[estadoNow]
                        )}
                      >
                        {(Object.keys(ESTADO_LABEL) as EstadoType[]).map((k) => (
                          <option key={k} value={k}>{ESTADO_LABEL[k]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Expand toggle */}
                    <div className="flex items-center justify-center">
                      {expanded
                        ? <ChevronUp  className="h-3.5 w-3.5 text-neutral-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                      }
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="border-t border-[#F0F0F0] bg-neutral-50 px-6 py-4">
                      <div className="grid grid-cols-[1fr_280px] gap-6">

                        {/* Left: resumen + mensaje */}
                        <div className="space-y-3">
                          <div>
                            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                              Resumen
                            </p>
                            <p className="text-[12.5px] leading-relaxed text-neutral-700">{entry.resumen}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                              Mensaje original
                            </p>
                            <p className="rounded-lg border border-[#E8E8E8] bg-white p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-neutral-600 italic">
                              {entry.mensaje_textual}
                            </p>
                          </div>
                        </div>

                        {/* Right: meta info */}
                        <div className="space-y-3">
                          <MetaRow label="Canal"      value={entry.canal === 'email' ? 'Email' : 'LinkedIn'} />
                          <MetaRow label="Empresa"    value={entry.empresa} />
                          <MetaRow label="Cargo"      value={entry.cargo} />
                          <MetaRow label="Categoría"  value={CATEGORIA_LABEL[entry.categoria]} />
                          <MetaRow label="Prioridad"  value={PRIORIDAD_LABEL[entry.prioridad]} />
                          <MetaRow label="Fecha"      value={entry.fecha} />
                          {entry.notas !== 'no disponible' && (
                            <div>
                              <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                                Notas
                              </p>
                              <p className="text-[12px] leading-relaxed text-neutral-500">{entry.notas}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options, noAll = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  noAll?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11.5px] text-neutral-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'cursor-pointer rounded-md border border-[#D9D9D9] bg-white px-2 py-1 text-[12px] text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-neutral-400',
          value && !noAll && 'border-[#0A0A0A] font-medium text-[#0A0A0A]',
        )}
      >
        {!noAll && <option value="">Todos</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={cn('text-[12px] text-neutral-700', value === 'no disponible' && 'text-neutral-400 italic')}>
        {value}
      </p>
    </div>
  )
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}
