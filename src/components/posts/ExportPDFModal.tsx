'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, FileDown, Loader2 } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { PostWithDetails } from '@/lib/types'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  posts: PostWithDetails[]
  onClose: () => void
}

export function ExportPDFModal({ posts, onClose }: Props) {
  const [month,    setMonth]    = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [channel,  setChannel]  = useState('all')
  const [status,   setStatus]   = useState('all')
  const [loading,  setLoading]  = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const [{ pdf }, { buildContentPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ContentPDF'),
      ])
      const doc  = buildContentPDF({ posts, month, channel, status })
      const blob = await pdf(doc).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `contenido-${MONTHS_ES[month.getMonth()].toLowerCase()}-${month.getFullYear()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Error al generar el PDF. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[380px] rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100">
              <FileDown className="h-3.5 w-3.5 text-neutral-600" />
            </div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Exportar PDF</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">

          {/* Month selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Mes a exportar
            </label>
            <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-neutral-50 px-3 py-2">
              <button
                onClick={() => setMonth((m) => subMonths(m, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white hover:shadow-sm"
              >
                <ChevronLeft className="h-4 w-4 text-neutral-500" />
              </button>
              <span className="text-[13px] font-semibold text-neutral-800">
                {MONTHS_ES[month.getMonth()]} {month.getFullYear()}
              </span>
              <button
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white hover:shadow-sm"
              >
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Channel selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Canal
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { value: 'all',       label: 'Todos' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'linkedin',  label: 'LinkedIn' },
                { value: 'x',         label: 'X' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setChannel(value)}
                  className={`rounded-lg border py-2 text-[11.5px] font-medium transition-all ${
                    channel === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-[#E5E5E5] bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Estado
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { value: 'all',       label: 'Todos' },
                { value: 'draft',     label: 'Draft' },
                { value: 'scheduled', label: 'Sched.' },
                { value: 'published', label: 'Pub.' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`rounded-lg border py-2 text-[11.5px] font-medium transition-all ${
                    status === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-[#E5E5E5] bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-[#F0F0F0] px-5 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E5E5E5] px-4 py-2 text-[12.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-[12.5px] font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                Generar PDF
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
