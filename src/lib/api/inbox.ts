import { createClient }          from '@/lib/supabase/client'
import { INBOX_DATA, InboxEntry } from '@/lib/data/inbox'

// ── DB row shape (snake_case) ──────────────────────────────────────────────────

interface InboxRow {
  id:               string
  fecha:            string
  date_iso:         string
  canal:            string
  nombre:           string
  empresa:          string
  cargo:            string
  email:            string
  telefono:         string
  linkedin_url:     string
  mensaje_textual:  string
  resumen:          string
  categoria:        string
  prioridad:        string
  estado:           string
  notas:            string
  created_at?:      string
}

// ── Mappers ────────────────────────────────────────────────────────────────────

function rowToEntry(row: InboxRow): InboxEntry {
  return {
    id:              row.id,
    fecha:           row.fecha,
    dateISO:         row.date_iso,
    canal:           row.canal            as InboxEntry['canal'],
    nombre:          row.nombre,
    empresa:         row.empresa,
    cargo:           row.cargo,
    email:           row.email,
    telefono:        row.telefono,
    linkedin_url:    row.linkedin_url,
    mensaje_textual: row.mensaje_textual,
    resumen:         row.resumen,
    categoria:       row.categoria        as InboxEntry['categoria'],
    prioridad:       row.prioridad        as InboxEntry['prioridad'],
    estado:          row.estado           as InboxEntry['estado'],
    notas:           row.notas,
  }
}

function entryToRow(entry: Partial<InboxEntry>): Partial<InboxRow> {
  const row: Partial<InboxRow> = {}
  if (entry.id              !== undefined) row.id              = entry.id
  if (entry.fecha           !== undefined) row.fecha           = entry.fecha
  if (entry.dateISO         !== undefined) row.date_iso        = entry.dateISO
  if (entry.canal           !== undefined) row.canal           = entry.canal
  if (entry.nombre          !== undefined) row.nombre          = entry.nombre
  if (entry.empresa         !== undefined) row.empresa         = entry.empresa
  if (entry.cargo           !== undefined) row.cargo           = entry.cargo
  if (entry.email           !== undefined) row.email           = entry.email
  if (entry.telefono        !== undefined) row.telefono        = entry.telefono
  if (entry.linkedin_url    !== undefined) row.linkedin_url    = entry.linkedin_url
  if (entry.mensaje_textual !== undefined) row.mensaje_textual = entry.mensaje_textual
  if (entry.resumen         !== undefined) row.resumen         = entry.resumen
  if (entry.categoria       !== undefined) row.categoria       = entry.categoria
  if (entry.prioridad       !== undefined) row.prioridad       = entry.prioridad
  if (entry.estado          !== undefined) row.estado          = entry.estado
  if (entry.notas           !== undefined) row.notas           = entry.notas
  return row
}

// ── Seed ──────────────────────────────────────────────────────────────────────
// On first use, if the table is empty, populate it from the static TypeScript
// data so existing records are preserved when migrating.

export async function seedInboxIfEmpty(): Promise<void> {
  const supabase = createClient()

  const { count, error: countErr } = await supabase
    .from('inbox_entries')
    .select('*', { count: 'exact', head: true })

  if (countErr) throw new Error(countErr.message)
  if (count && count > 0) return // already seeded

  const rows = INBOX_DATA.map(entryToRow)
  const { error } = await supabase.from('inbox_entries').insert(rows)
  if (error) throw new Error(error.message)
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function fetchInboxEntries(): Promise<InboxEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inbox_entries')
    .select('*')
    .order('date_iso', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as InboxRow[]).map(rowToEntry)
}

export async function createInboxEntry(entry: InboxEntry): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('inbox_entries')
    .insert(entryToRow(entry))

  if (error) throw new Error(error.message)
}

export async function updateInboxEntry(
  id:      string,
  updates: Partial<InboxEntry>,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('inbox_entries')
    .update(entryToRow(updates))
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteInboxEntry(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('inbox_entries')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
