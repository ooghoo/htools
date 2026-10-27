import { createContext, useContext, type Context } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  /** 是否由用户手动指定过（否则跟随系统） */
  isExplicit: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  resetToSystem: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface FavoritesContextValue {
  favorites: string[]
  isFavorite: (toolId: string) => boolean
  /** 返回切换后的状态：true = 已收藏 */
  toggleFavorite: (toolId: string) => boolean
  clearFavorites: () => void
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export interface RecentEntry {
  id: string
  /** 最近一次访问的时间戳（毫秒） */
  at: number
}

export interface RecentContextValue {
  recent: RecentEntry[]
  recordVisit: (toolId: string) => void
  clearRecent: () => void
}

export const RecentContext = createContext<RecentContextValue | null>(null)

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/* ------------------------------------------------------------
 * 访问器：必须在对应的 Provider 内使用
 * ---------------------------------------------------------- */

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context)
  if (!value) {
    throw new Error(`${name} 必须在对应的 Provider 内使用`)
  }
  return value
}

export function useTheme(): ThemeContextValue {
  return useRequiredContext(ThemeContext, 'useTheme')
}

export function useFavorites(): FavoritesContextValue {
  return useRequiredContext(FavoritesContext, 'useFavorites')
}

export function useRecentTools(): RecentContextValue {
  return useRequiredContext(RecentContext, 'useRecentTools')
}

export function useToast(): ToastContextValue {
  return useRequiredContext(ToastContext, 'useToast')
}
