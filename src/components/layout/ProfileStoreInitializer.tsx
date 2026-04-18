'use client'

import { useEffect } from 'react'
import { useProfileStore } from '@/store/useProfileStore'
import { UserRole } from '@/lib/types'

interface Props {
  role: UserRole
  userId: string
  email: string
}

export function ProfileStoreInitializer({ role, userId, email }: Props) {
  const init = useProfileStore((s) => s.init)
  useEffect(() => {
    init({ role, userId, email })
  }, [role, userId, email, init])
  return null
}
