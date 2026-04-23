'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown, ChevronUp, Mail, X as XIcon, Search, Plus, ExternalLink,
} from 'lucide-react'
import {
  INBOX_DATA, InboxEntry, CanalType, CategoriaType, PrioridadType, EstadoType,
} from '@/lib/data/inbox'
import { cn } from '@/lib/utils'

// ── Label / style maps ─────────────────────────────────────────────────────────

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
const ESTADO_ORDER:    Record<EstadoType, number>    = { pendiente: 1, en_curso: 2, respondido: 3, descartado: 4 }
const CATEGORIA_ORDER: Record<CategoriaType, number> = { hiring: 1, investor: 2, partnership: 3, sales: 4, media: 5, general: 6 }

// ── Types ──────────────────────────────────────────────────────────────────────

type SortCol = 'fecha' | 'nombre' | 'categoria' | 'prioridad' | 'estado'
interface SortState { col: SortCol; dir: 'asc' | 'desc' }

const DEFAULT_DIR: Record<SortCol, 'asc' | 'desc'> = {
  fecha: 'desc', nombre: 'asc', categoria: 'asc', prioridad: 'desc', estado: 'asc',
}

interface Filters {
  canal:     CanalType | ''
  categoria: CategoriaType | ''
  prioridad: PrioridadType | ''
  estado:    EstadoType | ''
}

const EMPTY_FILTERS: Filters = { canal: '', categoria: '', prioridad: '', estado: '' }

interface NewForm {
  fecha:           string
  canal:           CanalType
  nombre:          string
  empresa:         string
  cargo:           string
  email:           string
  linkedin_url:    string
  mensaje_textual: string
  resumen:         string
  categoria:       CategoriaType
  prioridad:       PrioridadType
  notas:           string
}

const EMPTY_FORM: NewForm = {
  fecha:           new Date().toISOString().slice(0, 10),
  canal:           'email',
  nombre:          '',
  empresa:         '',
  cargo:           '',
  email:           '',
  linkedin_url:    '',
  mensaje_textual: '',
  resumen:         '',
  categoria:       'general',
  prioridad:       'medium',
  notas:           '',
}

// ── Gmail compose URL ──────────────────────────────────────────────────────────

function gmailComposeUrl(email: string, nombre: string): string {
  const subject = 'Re: Consulta a BigSur Energy'
  const body    = `Hola ${nombre},\n\nGracias por comunicarte con nosotros. Recibimos tu consulta y nos ponemos en contacto para darte una respuesta.\n\n[aquí el equipo completa la respuesta]`
  return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ── Input style constant ───────────────────────────────────────────────────────

const INPUT_CLS = 'w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-1.5 text-[12.5px] text-neutral-700 placeholder:text-neutral-400 outline-none transition-colors focus:border-neutral-400'

// ── Main component ─────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [filters,        setFilters]        = useState<Filters>(EMPTY_FILTERS)
  const [sort,           setSort]           = useState<SortState>({ col: 'fecha', dir: 'desc' })
  const [searchQuery,    setSearchQuery]    = useState('')
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [statusOverride, setStatusOverride] = useState<Record<string, EstadoType>>({})
  const [showNewModal,   setShowNewModal]   = useState(false)
  const [newForm,        setNewForm]        = useState<NewForm>(EMPTY_FORM)
  const [customEntries,  setCustomEntries]  = useState<InboxEntry[]>([])

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

  function handleSortClick(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: DEFAULT_DIR[col] }
    )
  }

  function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault()
    const [y, m, d] = newForm.fecha.split('-')
    const fecha   = `${d}.${m}.${y}`
    const dateISO = newForm.fecha
    const newEntry: InboxEntry = {
      id:              `custom-${Date.now()}`,
      fecha,
      dateISO,
      canal:           newForm.canal,
      nombre:          newForm.nombre.trim() || 'Sin nombre',
      empresa:         newForm.empresa.trim() || 'no disponible',
      cargo:           newForm.cargo.trim()   || 'no disponible',
      email:           newForm.email.trim(),
      linkedin_url:    newForm.linkedin_url.trim(),
      mensaje_textual: newForm.mensaje_textual,
      resumen:         newForm.resumen.trim() || newForm.mensaje_textual.slice(0, 120),
      categoria:       newForm.categoria,
      prioridad:       newForm.prioridad,
      estado:          'pendiente',
      notas:           newForm.notas.trim() || 'no disponible',
    }
    setCustomEntries((prev) => [newEntry, ...prev])
    setShowNewModal(false)
    setNewForm(EMPTY_FORM)
  }

  const allData = useMemo(() => [...customEntries, ...INBOX_DATA], [customEntries])
  const hasActiveFilters = Object.values(filters).some(Boolean)
  const hasSearch        = searchQuery.trim() !== ''

  const entries = useMemo(() => {
    let data = allData.map((e) => ({ ...e, estadoActual: getEstado(e) }))

    // Filters
    if (filters.canal)     data = data.filter((e) => e.canal         === filters.canal)
    if (filters.categoria) data = data.filter((e) => e.categoria     === filters.categoria)
    if (filters.prioridad) data = data.filter((e) => e.prioridad     === filters.prioridad)
    if (filters.estado)    data = data.filter((e) => e.estadoActual  === filters.estado)

    // Search
    if (hasSearch) {
      const q = searchQuery.toLowerCase().trim()
      data = data.filter((e) =>
        [e.nombre, e.empresa, e.cargo, e.resumen, e.mensaje_textual].some((f) =>
          f.toLowerCase().includes(q)
        )
      )
    }

    // Sort
    data.sort((a, b) => {
      let cmp = 0
      switch (sort.col) {
        case 'fecha':     cmp = a.dateISO.localeCompare(b.dateISO);                                  break
        case 'nombre':    cmp = a.nombre.localeCompare(b.nombre, 'es');                              break
        case 'categoria': cmp = CATEGORIA_ORDER[a.categoria] - CATEGORIA_ORDER[b.categoria];         break
        case 'prioridad': cmp = PRIORIDAD_ORDER[a.prioridad] - PRIORIDAD_ORDER[b.prioridad];         break
        case 'estado':    cmp = ESTADO_ORDER[a.estadoActual] - ESTADO_ORDER[b.estadoActual];         break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, searchQuery, statusOverride, allData])

  return (
    <>
    <div className="flex h-full flex-col overflow-hidden bg-[#F2F2F2]">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[#D9D9D9] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-[#0A0A0A]">Inbox</h1>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
              {entries.length} / {allData.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#111111] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-neutral-800 hover:-translate-y-px active:scale-[0.99]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Nueva Consulta
          </button>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-[#E8E8E8] bg-white px-6 py-2.5">
        <FilterSelect
          label="Canal" value={filters.canal}
          onChange={(v) => setFilters((f) => ({ ...f, canal: v as CanalType | '' }))}
          options={[
            { value: 'email',    label: 'Email' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'otro',     label: 'Otro' },
          ]}
        />
        <FilterSelect
          label="Categoría" value={filters.categoria}
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
        <FilterSelect
          label="Prioridad" value={filters.prioridad}
          onChange={(v) => setFilters((f) => ({ ...f, prioridad: v as PrioridadType | '' }))}
          options={[
            { value: 'high',   label: 'Alta' },
            { value: 'medium', label: 'Media' },
            { value: 'low',    label: 'Baja' },
          ]}
        />
        <FilterSelect
          label="Estado" value={filters.estado}
          onChange={(v) => setFilters((f) => ({ ...f, estado: v as EstadoType | '' }))}
          options={[
            { value: 'pendiente',  label: 'Pendiente' },
            { value: 'en_curso',   label: 'En curso' },
            { value: 'respondido', label: 'Respondido' },
            { value: 'descartado', label: 'Descartado' },
          ]}
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

      {/* ── Search bar ── */}
      <div className="shrink-0 flex items-center gap-4 border-b border-[#D9D9D9] bg-white px-6 py-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa, cargo, mensaje…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#D9D9D9] bg-white py-1.5 pl-7 pr-7 text-[12.5px] text-neutral-700 placeholder:text-neutral-400 outline-none transition-colors focus:border-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="shrink-0 text-[11.5px] text-neutral-400">
          Mostrando{' '}
          <span className="font-semibold text-neutral-600">{entries.length}</span>
          {' '}de{' '}
          <span className="font-semibold text-neutral-600">{allData.length}</span>
          {' '}consultas
        </span>
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
            <div className="grid grid-cols-[90px_130px_1fr_2fr_100px_72px_126px_32px] items-center gap-3 border-b border-[#E8E8E8] bg-neutral-50 px-4 py-2">
              <SortHeader col="fecha"     label="Fecha"     sort={sort} onClick={handleSortClick} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Contacto</span>
              <SortHeader col="nombre"    label="Nombre"    sort={sort} onClick={handleSortClick} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Resumen</span>
              <SortHeader col="categoria" label="Categoría" sort={sort} onClick={handleSortClick} />
              <SortHeader col="prioridad" label="Prior."    sort={sort} onClick={handleSortClick} />
              <SortHeader col="estado"    label="Estado"    sort={sort} onClick={handleSortClick} />
              <span />
            </div>

            {/* Rows */}
            {entries.map((entry) => {
              const expanded  = expandedId === entry.id
              const estadoNow = entry.estadoActual

              return (
                <div key={entry.id} className="border-b border-[#F0F0F0] last:border-0">

                  {/* Main row */}
                  <div
                    onClick={() => toggleExpand(entry.id)}
                    className={cn(
                      'grid grid-cols-[90px_130px_1fr_2fr_100px_72px_126px_32px] cursor-pointer items-start gap-3 px-4 py-3 transition-colors',
                      expanded ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                    )}
                  >
                    {/* Fecha */}
                    <span className="text-[12px] text-neutral-500 tabular-nums pt-0.5">{entry.fecha}</span>

                    {/* Contacto (action) */}
                    <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                      <ContactAction entry={entry} />
                    </div>

                    {/* Nombre */}
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
                    <div className="flex items-center gap-1 pt-0.5">
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
                    <div className="flex items-center justify-center pt-0.5">
                      {expanded
                        ? <ChevronUp   className="h-3.5 w-3.5 text-neutral-400" />
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

                        {/* Right: meta */}
                        <div className="space-y-3">
                          <MetaRow label="Canal"     value={entry.canal === 'email' ? 'Email' : entry.canal === 'linkedin' ? 'LinkedIn' : 'Otro'} />
                          <MetaRow label="Empresa"   value={entry.empresa} />
                          <MetaRow label="Cargo"     value={entry.cargo} />
                          <MetaRow label="Categoría" value={CATEGORIA_LABEL[entry.categoria]} />
                          <MetaRow label="Prioridad" value={PRIORIDAD_LABEL[entry.prioridad]} />
                          <MetaRow label="Fecha"     value={entry.fecha} />
                          {(entry.email || entry.linkedin_url) && (
                            <div>
                              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                                Acción
                              </p>
                              <ContactAction entry={entry} variant="expanded" />
                            </div>
                          )}
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

    {/* ── Nueva Consulta Modal ── */}
    {showNewModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false) }}
      >
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E8E8E8] px-6 py-4">
            <h2 className="text-[14px] font-bold text-[#0A0A0A]">Nueva Consulta</h2>
            <button
              onClick={() => setShowNewModal(false)}
              className="text-neutral-400 transition-colors hover:text-neutral-700"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitNew} className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-3.5">

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Fecha">
                <input
                  type="date" required
                  value={newForm.fecha}
                  onChange={(e) => setNewForm((f) => ({ ...f, fecha: e.target.value }))}
                  className={INPUT_CLS}
                />
              </FieldGroup>
              <FieldGroup label="Canal">
                <select
                  value={newForm.canal}
                  onChange={(e) => setNewForm((f) => ({ ...f, canal: e.target.value as CanalType }))}
                  className={INPUT_CLS}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="otro">Otro</option>
                </select>
              </FieldGroup>
            </div>

            <FieldGroup label="Nombre *">
              <input
                type="text" required placeholder="Nombre del contacto"
                value={newForm.nombre}
                onChange={(e) => setNewForm((f) => ({ ...f, nombre: e.target.value }))}
                className={INPUT_CLS}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Empresa">
                <input
                  type="text" placeholder="Empresa"
                  value={newForm.empresa}
                  onChange={(e) => setNewForm((f) => ({ ...f, empresa: e.target.value }))}
                  className={INPUT_CLS}
                />
              </FieldGroup>
              <FieldGroup label="Cargo">
                <input
                  type="text" placeholder="Cargo"
                  value={newForm.cargo}
                  onChange={(e) => setNewForm((f) => ({ ...f, cargo: e.target.value }))}
                  className={INPUT_CLS}
                />
              </FieldGroup>
            </div>

            {newForm.canal === 'email' && (
              <FieldGroup label="Email">
                <input
                  type="email" placeholder="email@ejemplo.com"
                  value={newForm.email}
                  onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                  className={INPUT_CLS}
                />
              </FieldGroup>
            )}
            {newForm.canal === 'linkedin' && (
              <FieldGroup label="URL de LinkedIn">
                <input
                  type="url" placeholder="https://linkedin.com/in/..."
                  value={newForm.linkedin_url}
                  onChange={(e) => setNewForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                  className={INPUT_CLS}
                />
              </FieldGroup>
            )}

            <FieldGroup label="Mensaje">
              <textarea
                rows={3} placeholder="Mensaje original del contacto"
                value={newForm.mensaje_textual}
                onChange={(e) => setNewForm((f) => ({ ...f, mensaje_textual: e.target.value }))}
                className={cn(INPUT_CLS, 'resize-none')}
              />
            </FieldGroup>

            <FieldGroup label="Resumen">
              <input
                type="text" placeholder="Resumen breve de la consulta"
                value={newForm.resumen}
                onChange={(e) => setNewForm((f) => ({ ...f, resumen: e.target.value }))}
                className={INPUT_CLS}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Categoría">
                <select
                  value={newForm.categoria}
                  onChange={(e) => setNewForm((f) => ({ ...f, categoria: e.target.value as CategoriaType }))}
                  className={INPUT_CLS}
                >
                  <option value="hiring">Hiring</option>
                  <option value="investor">Investor</option>
                  <option value="partnership">Partnership</option>
                  <option value="sales">Sales</option>
                  <option value="media">Media</option>
                  <option value="general">General</option>
                </select>
              </FieldGroup>
              <FieldGroup label="Prioridad">
                <select
                  value={newForm.prioridad}
                  onChange={(e) => setNewForm((f) => ({ ...f, prioridad: e.target.value as PrioridadType }))}
                  className={INPUT_CLS}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </FieldGroup>
            </div>

            <FieldGroup label="Notas">
              <textarea
                rows={2} placeholder="Notas adicionales (opcional)"
                value={newForm.notas}
                onChange={(e) => setNewForm((f) => ({ ...f, notas: e.target.value }))}
                className={cn(INPUT_CLS, 'resize-none')}
              />
            </FieldGroup>

            <p className="text-[11.5px] text-neutral-400">
              Estado inicial:{' '}
              <span className="font-semibold text-neutral-600">Pendiente</span>
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-[#F0F0F0] pt-4">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg border border-[#D9D9D9] px-4 py-1.5 text-[12.5px] text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#111111] px-4 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-neutral-800"
              >
                Guardar consulta
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortHeader({
  col, label, sort, onClick,
}: {
  col: SortCol
  label: string
  sort: SortState
  onClick: (col: SortCol) => void
}) {
  const active = sort.col === col
  return (
    <button
      onClick={() => onClick(col)}
      className={cn(
        'flex items-center gap-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition-colors',
        active ? 'text-[#0A0A0A]' : 'text-neutral-400 hover:text-neutral-600'
      )}
    >
      {label}
      <span className="ml-0.5 text-[9px] opacity-60">
        {active ? (sort.dir === 'asc' ? '↑' : '↓') : '⇅'}
      </span>
    </button>
  )
}

function ContactAction({
  entry, variant = 'row',
}: {
  entry: InboxEntry
  variant?: 'row' | 'expanded'
}) {
  const btnCls = cn(
    'inline-flex items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white text-neutral-600 transition-all hover:border-neutral-400 hover:bg-neutral-50',
    variant === 'expanded' ? 'px-3 py-1.5 text-[12px]' : 'px-2 py-1 text-[11px]'
  )
  const iconSize = variant === 'expanded' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  if (entry.email) {
    return (
      <a
        href={gmailComposeUrl(entry.email, entry.nombre)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={btnCls}
      >
        <Mail className={cn(iconSize, 'shrink-0')} strokeWidth={1.75} />
        {variant === 'expanded' ? 'Responder por Gmail' : 'Gmail'}
      </a>
    )
  }
  if (entry.linkedin_url) {
    return (
      <a
        href={entry.linkedin_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={btnCls}
      >
        <LinkedInIcon size={variant === 'expanded' ? 14 : 11} />
        {variant === 'expanded' ? 'Ver en LinkedIn' : 'LinkedIn'}
        <ExternalLink className={cn('shrink-0 text-neutral-400', variant === 'expanded' ? 'h-3 w-3' : 'h-2.5 w-2.5')} />
      </a>
    )
  }
  return <span className="text-[11px] text-neutral-300">—</span>
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11.5px] text-neutral-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'cursor-pointer rounded-md border border-[#D9D9D9] bg-white px-2 py-1 text-[12px] text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-neutral-400',
          value && 'border-[#0A0A0A] font-medium text-[#0A0A0A]',
        )}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11.5px] font-medium text-neutral-600">{label}</label>
      {children}
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

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-neutral-500">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}
