'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ChevronDown, ChevronUp, Mail, X as XIcon, Search, Plus, ExternalLink, Pencil, Trash2,
} from 'lucide-react'
import {
  INBOX_DATA, InboxEntry, CanalType, CategoriaType, PrioridadType, EstadoType,
} from '@/lib/data/inbox'
import { cn } from '@/lib/utils'

// ── Label / style maps ─────────────────────────────────────────────────────────

const CATEGORIA_LABEL: Record<CategoriaType, string> = {
  hiring: 'Hiring', investor: 'Investor', partnership: 'Partnership',
  sales: 'Sales', media: 'Media', general: 'General',
  land: 'Terreno', press: 'Prensa', marketing: 'Marketing',
}

const CATEGORIA_STYLE: Record<CategoriaType, string> = {
  hiring:      'bg-blue-50    text-blue-700    border border-blue-100',
  investor:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  partnership: 'bg-violet-50  text-violet-700  border border-violet-100',
  sales:       'bg-orange-50  text-orange-700  border border-orange-100',
  media:       'bg-rose-50    text-rose-700    border border-rose-100',
  general:     'bg-neutral-100 text-neutral-600 border border-neutral-200',
  land:        'bg-amber-50   text-amber-800   border border-amber-100',
  press:       'bg-indigo-50  text-indigo-700  border border-indigo-100',
  marketing:   'bg-pink-50    text-pink-700    border border-pink-100',
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
const CATEGORIA_ORDER: Record<CategoriaType, number> = { hiring: 1, investor: 2, partnership: 3, sales: 4, media: 5, general: 6, land: 7, press: 8, marketing: 9 }

// ── Select option arrays ───────────────────────────────────────────────────────

const CANAL_OPTS: { value: string; label: string }[] = [
  { value: 'email', label: 'Email' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'otro', label: 'Otro' },
]
const CATEGORIA_OPTS: { value: string; label: string }[] = [
  { value: 'hiring', label: 'Hiring' }, { value: 'investor', label: 'Investor' },
  { value: 'partnership', label: 'Partnership' }, { value: 'sales', label: 'Sales' },
  { value: 'media', label: 'Media' }, { value: 'general', label: 'General' },
  { value: 'land', label: 'Terreno' }, { value: 'press', label: 'Prensa' },
  { value: 'marketing', label: 'Marketing' },
]
const PRIORIDAD_OPTS: { value: string; label: string }[] = [
  { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Media' }, { value: 'low', label: 'Baja' },
]

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
  telefono:        string
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
  telefono:        '',
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
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, Partial<InboxEntry>>>({})
  const [showNewModal,    setShowNewModal]    = useState(false)
  const [newForm,         setNewForm]         = useState<NewForm>(EMPTY_FORM)
  const [customEntries,   setCustomEntries]   = useState<InboxEntry[]>([])
  const [deletedIds,      setDeletedIds]      = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function getEstado(entry: InboxEntry): EstadoType {
    return statusOverride[entry.id] ?? entry.estado
  }

  function updateEstado(id: string, estado: EstadoType) {
    setStatusOverride((prev) => ({ ...prev, [id]: estado }))
  }

  function patchField(id: string, updates: Partial<InboxEntry>) {
    setFieldOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...updates } }))
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
      telefono:        newForm.telefono.trim(),
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

  function handleDeleteConfirmed() {
    if (!confirmDeleteId) return
    setDeletedIds((prev) => new Set([...prev, confirmDeleteId]))
    if (expandedId === confirmDeleteId) setExpandedId(null)
    setConfirmDeleteId(null)
  }

  const allData = useMemo(
    () => [...customEntries, ...INBOX_DATA].filter((e) => !deletedIds.has(e.id)),
    [customEntries, deletedIds]
  )
  const hasActiveFilters = Object.values(filters).some(Boolean)
  const hasSearch        = searchQuery.trim() !== ''

  const entries = useMemo(() => {
    let data = allData.map((e) => {
      const overridden = { ...e, ...(fieldOverrides[e.id] ?? {}) }
      return { ...overridden, estadoActual: statusOverride[e.id] ?? overridden.estado }
    })

    // Filters
    if (filters.canal)     data = data.filter((e) => e.canal        === filters.canal)
    if (filters.categoria) data = data.filter((e) => e.categoria    === filters.categoria)
    if (filters.prioridad) data = data.filter((e) => e.prioridad    === filters.prioridad)
    if (filters.estado)    data = data.filter((e) => e.estadoActual === filters.estado)

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
        case 'fecha':     cmp = a.dateISO.localeCompare(b.dateISO);                          break
        case 'nombre':    cmp = a.nombre.localeCompare(b.nombre, 'es');                      break
        case 'categoria': cmp = CATEGORIA_ORDER[a.categoria] - CATEGORIA_ORDER[b.categoria]; break
        case 'prioridad': cmp = PRIORIDAD_ORDER[a.prioridad] - PRIORIDAD_ORDER[b.prioridad]; break
        case 'estado':    cmp = ESTADO_ORDER[a.estadoActual] - ESTADO_ORDER[b.estadoActual]; break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, searchQuery, statusOverride, fieldOverrides, allData])

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
            <div className="grid grid-cols-[90px_130px_1fr_2fr_100px_72px_126px_24px_28px] items-center gap-3 border-b border-[#E8E8E8] bg-neutral-50 px-4 py-2">
              <SortHeader col="fecha"     label="Fecha"     sort={sort} onClick={handleSortClick} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Contacto</span>
              <SortHeader col="nombre"    label="Nombre"    sort={sort} onClick={handleSortClick} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">Resumen</span>
              <SortHeader col="categoria" label="Categoría" sort={sort} onClick={handleSortClick} />
              <SortHeader col="prioridad" label="Prior."    sort={sort} onClick={handleSortClick} />
              <SortHeader col="estado"    label="Estado"    sort={sort} onClick={handleSortClick} />
              <span />
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
                      'group grid grid-cols-[90px_130px_1fr_2fr_100px_72px_126px_24px_28px] cursor-pointer items-start gap-3 px-4 py-3 transition-colors',
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
                    <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                      <PrioridadDropdown
                        value={entry.prioridad}
                        onChange={(v) => patchField(entry.id, { prioridad: v })}
                      />
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

                    {/* Trash */}
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center pt-0.5">
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 hover:text-red-500"
                        title="Eliminar contacto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Expand toggle */}
                    <div className="flex items-center justify-center pt-0.5">
                      {expanded
                        ? <ChevronUp   className="h-3.5 w-3.5 text-neutral-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                      }
                    </div>
                  </div>

                  {/* ── Expanded detail ── */}
                  {expanded && (
                    <div className="border-t border-[#F0F0F0] bg-neutral-50 px-6 py-4">
                      <div className="grid grid-cols-[1fr_240px] gap-6">

                        {/* Left: mensaje original */}
                        <div>
                          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                            Mensaje original
                          </p>
                          <InlineField
                            value={entry.mensaje_textual}
                            type="textarea"
                            onSave={(v) => patchField(entry.id, { mensaje_textual: v })}
                            placeholder="Sin mensaje…"
                            variant="boxed"
                          />
                        </div>

                        {/* Right: email + fecha */}
                        <div className="space-y-3">
                          <EditableMetaRow
                            label="Email"
                            value={entry.email}
                            type="text"
                            placeholder="no disponible"
                            onSave={(v) => patchField(entry.id, { email: v.trim() })}
                            staticCls="break-all"
                          />
                          <EditableMetaRow
                            label="Teléfono"
                            value={entry.telefono}
                            type="text"
                            placeholder="no disponible"
                            onSave={(v) => patchField(entry.id, { telefono: v.trim() })}
                          />
                          <EditableMetaRow
                            label="Fecha"
                            value={entry.dateISO}
                            displayValue={entry.fecha}
                            type="date"
                            onSave={(v) => {
                              if (!v) return
                              const [y, m, d] = v.split('-')
                              patchField(entry.id, { fecha: `${d}.${m}.${y}`, dateISO: v })
                            }}
                          />
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
            <FieldGroup label="Teléfono">
              <input
                type="text" placeholder="+54 9 11 1234 5678"
                value={newForm.telefono}
                onChange={(e) => setNewForm((f) => ({ ...f, telefono: e.target.value }))}
                className={INPUT_CLS}
              />
            </FieldGroup>
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
    {/* ── Confirmar eliminación Modal ── */}
    {confirmDeleteId && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
      >
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div className="px-6 py-5">
            <h2 className="mb-2 text-[14px] font-bold text-[#0A0A0A]">Eliminar contacto</h2>
            <p className="text-[12.5px] leading-relaxed text-neutral-600">
              ¿Estás seguro que querés eliminar este contacto? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#F0F0F0] px-6 py-4">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg border border-[#D9D9D9] px-4 py-1.5 text-[12.5px] text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteConfirmed}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── InlineField ────────────────────────────────────────────────────────────────
// Renders a value that becomes editable on click. Supports text, date, select,
// textarea. variant="boxed" wraps the static display in a bordered card
// (used for Mensaje original).

type InlineFieldType = 'text' | 'date' | 'select' | 'textarea'

function InlineField({
  value,
  displayValue,
  type,
  options,
  onSave,
  placeholder = 'no disponible',
  staticCls,
  variant = 'inline',
}: {
  value:         string
  displayValue?: string           // shown in static mode if different from value
  type:          InlineFieldType
  options?:      { value: string; label: string }[]
  onSave:        (v: string) => void
  placeholder?:  string
  staticCls?:    string
  variant?:      'inline' | 'boxed'
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)

  function open() {
    setDraft(value)
    setEditing(true)
  }

  function save() {
    onSave(draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  // Auto-resize textarea: callback ref runs when element is mounted
  function initTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    el.focus()
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (editing) {
    if (type === 'select' && options) {
      return (
        <select
          autoFocus
          value={draft}
          onChange={(e) => { onSave(e.target.value); setEditing(false) }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
          className={cn(INPUT_CLS, 'py-1 text-[12px]')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }

    if (type === 'textarea') {
      const textareaCls = variant === 'boxed'
        ? 'w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 text-[12px] leading-relaxed text-neutral-600 italic outline-none focus:border-neutral-400 transition-colors'
        : cn(INPUT_CLS, 'resize-none text-[12px] leading-relaxed')
      return (
        <textarea
          ref={initTextarea}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
          className={textareaCls}
          rows={3}
        />
      )
    }

    // text | date
    return (
      <input
        autoFocus
        type={type === 'date' ? 'date' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') cancel()
        }}
        className={cn(INPUT_CLS, 'py-1 text-[12px]')}
      />
    )
  }

  // ── Static mode ────────────────────────────────────────────────────────────

  // Compute label to show
  const shown = displayValue
    ?? (type === 'select' ? (options?.find((o) => o.value === value)?.label ?? value) : value)
  const isEmpty = !shown || shown === 'no disponible'

  if (variant === 'boxed') {
    return (
      <div
        onClick={open}
        className="group relative cursor-text rounded-lg border border-[#E8E8E8] bg-white p-3 transition-colors hover:border-neutral-300"
      >
        <p className={cn(
          'text-[12px] leading-relaxed whitespace-pre-wrap',
          isEmpty ? 'text-neutral-400 italic' : 'text-neutral-600 italic'
        )}>
          {isEmpty ? placeholder : shown}
        </p>
        <Pencil className="absolute right-2.5 top-2.5 h-3 w-3 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    )
  }

  return (
    <div
      onClick={open}
      className="group flex cursor-text items-start gap-1.5"
    >
      <span className={cn(
        'flex-1 leading-relaxed transition-colors',
        isEmpty ? 'text-neutral-400 italic' : 'text-neutral-700',
        staticCls
      )}>
        {isEmpty ? placeholder : shown}
      </span>
      <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

// ── EditableMetaRow ────────────────────────────────────────────────────────────
// Label (non-editable) + InlineField value, used in the right column of the
// expanded panel.

function EditableMetaRow({
  label,
  value,
  displayValue,
  type,
  options,
  onSave,
  placeholder,
  staticCls,
}: {
  label:         string
  value:         string
  displayValue?: string
  type:          InlineFieldType
  options?:      { value: string; label: string }[]
  onSave:        (v: string) => void
  placeholder?:  string
  staticCls?:    string
}) {
  return (
    <div>
      <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </p>
      <InlineField
        value={value}
        displayValue={displayValue}
        type={type}
        options={options}
        onSave={onSave}
        placeholder={placeholder}
        staticCls={cn('text-[12px]', staticCls)}
      />
    </div>
  )
}

// ── PrioridadDropdown ──────────────────────────────────────────────────────────
// Inline dropdown to change priority directly from the table row badge.

function PrioridadDropdown({
  value,
  onChange,
}: {
  value:    PrioridadType
  onChange: (v: PrioridadType) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded px-0.5 py-0.5 transition-colors hover:bg-neutral-100"
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORIDAD_DOT[value])} />
        <span className={cn('text-[11.5px] font-medium', PRIORIDAD_TEXT[value])}>
          {PRIORIDAD_LABEL[value]}
        </span>
        <ChevronDown className="h-2.5 w-2.5 text-neutral-400" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-[88px] overflow-hidden rounded-lg border border-[#D9D9D9] bg-white shadow-md">
          {(['high', 'medium', 'low'] as PrioridadType[]).map((p) => (
            <button
              key={p}
              onClick={() => { onChange(p); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-neutral-50',
                value === p && 'bg-neutral-50'
              )}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORIDAD_DOT[p])} />
              <span className={cn('text-[11.5px] font-medium', PRIORIDAD_TEXT[p])}>
                {PRIORIDAD_LABEL[p]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortHeader({
  col, label, sort, onClick,
}: {
  col:     SortCol
  label:   string
  sort:    SortState
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
  entry:    InboxEntry
  variant?: 'row' | 'expanded'
}) {
  const btnCls = cn(
    'inline-flex items-center gap-1.5 rounded-md border border-[#D9D9D9] bg-white text-neutral-600 transition-all hover:border-neutral-400 hover:bg-neutral-50',
    variant === 'expanded' ? 'px-3 py-1.5 text-[12px]' : 'px-2 py-1 text-[11px]'
  )
  const iconSize = variant === 'expanded' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  // Show Gmail only when there is an actual email address to send to
  const showGmail    = !!entry.email && entry.email !== 'no disponible'
  // Show LinkedIn only when there is an actual URL to link to
  const showLinkedin = !!entry.linkedin_url && entry.linkedin_url !== 'no disponible'

  if (!showGmail && !showLinkedin) {
    return <span className="text-[11px] text-neutral-300">—</span>
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', variant === 'expanded' && 'gap-2')}>
      {showGmail && (
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
      )}
      {showLinkedin && (
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
      )}
    </div>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string }[]
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

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-neutral-500">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}
