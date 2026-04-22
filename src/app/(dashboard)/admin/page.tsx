'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Users } from 'lucide-react'
import { format } from 'date-fns'
import { toArDate } from '@/lib/dates'
import { UserProfile, UserRole } from '@/lib/types'
import { listProfiles, updateRole } from '@/lib/api/profiles'
import { useProfileStore } from '@/store/useProfileStore'
import { toast } from 'sonner'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  reviewer:    'Reviewer',
}

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewer:    'bg-neutral-100 text-neutral-600 border-neutral-200',
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const currentUserId = useProfileStore((s) => s.userId)
  const currentRole   = useProfileStore((s) => s.role)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await listProfiles()
        setProfiles(data)
      } catch (err) {
        console.error('[admin] listProfiles failed:', err)
        toast.error('Error al cargar usuarios')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId)
    try {
      await updateRole(userId, newRole)
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      )
      toast.success('Rol actualizado')
    } catch (err) {
      toast.error('Error al actualizar el rol')
    } finally {
      setUpdating(null)
    }
  }

  const stats = {
    total:       profiles.length,
    superAdmins: profiles.filter((p) => p.role === 'super_admin').length,
    reviewers:   profiles.filter((p) => p.role === 'reviewer').length,
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D9D9D9] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-black text-[#0A0A0A]">Panel de administración</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Total usuarios', value: stats.total,       icon: Users },
            { label: 'Super admins',   value: stats.superAdmins, icon: ShieldCheck },
            { label: 'Reviewers',      value: stats.reviewers,   icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
                <Icon className="h-3.5 w-3.5 text-neutral-300" />
              </div>
              <p className="mt-2 text-[24px] font-black text-neutral-900">{value}</p>
            </div>
          ))}
        </div>

        {/* User list */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="border-b border-[#F0F0F0] px-5 py-3">
            <p className="text-[12.5px] font-semibold text-neutral-700">Usuarios</p>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[12.5px] text-neutral-400">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F5F5]">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between px-5 py-3.5">
                  {/* User info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-semibold text-neutral-500">
                      {(profile.full_name || profile.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900">
                        {profile.full_name || profile.email || 'Sin nombre'}
                        {profile.id === currentUserId && (
                          <span className="ml-2 text-[10.5px] font-normal text-neutral-400">(tú)</span>
                        )}
                      </p>
                      {profile.full_name && (
                        <p className="text-[11.5px] text-neutral-400">{profile.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Role selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-neutral-400">
                      Desde {format(toArDate(profile.created_at), 'dd/MM/yy')}
                    </span>

                    {updating === profile.id ? (
                      <div className="flex h-8 w-28 items-center justify-center">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                      </div>
                    ) : (
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                        disabled={profile.id === currentUserId}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors focus:outline-none disabled:cursor-default disabled:opacity-60 ${ROLE_STYLES[profile.role]}`}
                      >
                        <option value="reviewer">Reviewer</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
