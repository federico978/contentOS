import { create } from 'zustand'
import { UserRole } from '@/lib/types'

interface ProfileState {
  role: UserRole | null
  userId: string | null
  email: string | null
  init: (profile: { role: UserRole; userId: string; email: string }) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  role: null,
  userId: null,
  email: null,
  init: ({ role, userId, email }) => set({ role, userId, email }),
}))
