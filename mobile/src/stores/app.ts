// ============================================================
// 应用全局状态
// loading / theme / networkType
// ============================================================
import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface AppState {
  loading: boolean
  theme: Theme
  networkType: string

  setLoading: (loading: boolean) => void
  setTheme: (theme: Theme) => void
  setNetworkType: (networkType: string) => void
}

export const useAppStore = create<AppState>()((set) => ({
  loading: false,
  theme: 'light',
  networkType: 'unknown',

  setLoading: (loading) => set({ loading }),
  setTheme: (theme) => set({ theme }),
  setNetworkType: (networkType) => set({ networkType })
}))
