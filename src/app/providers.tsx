import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FavoritesContext,
  RecentContext,
  ThemeContext,
  ToastContext,
  type RecentEntry,
  type Theme,
  type ToastTone,
} from './contexts'
import { readJSON, readRaw, removeRaw, STORAGE_KEYS, writeJSON, writeRaw } from '@/services/storage'
import { ToastViewport, type ToastItem } from '@/components/Toast'

const RECENT_LIMIT = 6
const TOAST_DURATION = 2200

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isRecentList(value: unknown): value is RecentEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentEntry).id === 'string' &&
        typeof (item as RecentEntry).at === 'number',
    )
  )
}

/* ------------------------------------------------------------------
 * 主题：默认跟随系统，手动切换后固定并记住
 * ---------------------------------------------------------------- */

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // index.html 的首帧脚本已经把最终结果写到 data-theme，这里直接读，避免二次闪烁
    const fromDom = document.documentElement.getAttribute('data-theme')
    if (fromDom === 'dark' || fromDom === 'light') return fromDom
    const stored = readRaw(STORAGE_KEYS.theme)
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [isExplicit, setIsExplicit] = useState<boolean>(() => {
    const stored = readRaw(STORAGE_KEYS.theme)
    return stored === 'dark' || stored === 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.getElementById('meta-theme')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#fbfbfc')
  }, [theme])

  // 未手动指定时跟随系统变化
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      if (readRaw(STORAGE_KEYS.theme)) return
      setThemeState(event.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    setIsExplicit(true)
    writeRaw(STORAGE_KEYS.theme, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      writeRaw(STORAGE_KEYS.theme, next)
      return next
    })
    setIsExplicit(true)
  }, [])

  const resetToSystem = useCallback(() => {
    removeRaw(STORAGE_KEYS.theme)
    setIsExplicit(false)
    setThemeState(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])

  const value = useMemo(
    () => ({ theme, isExplicit, setTheme, toggleTheme, resetToSystem }),
    [theme, isExplicit, setTheme, toggleTheme, resetToSystem],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/* ------------------------------------------------------------------
 * 收藏 + 最近使用：只存工具 ID，不存任何工具输入内容
 * ---------------------------------------------------------------- */

function LibraryProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() =>
    readJSON<string[]>(STORAGE_KEYS.favorites, [], isStringArray),
  )
  const [recent, setRecent] = useState<RecentEntry[]>(() =>
    readJSON<RecentEntry[]>(STORAGE_KEYS.recent, [], isRecentList),
  )

  useEffect(() => {
    writeJSON(STORAGE_KEYS.favorites, favorites)
  }, [favorites])

  useEffect(() => {
    writeJSON(STORAGE_KEYS.recent, recent)
  }, [recent])

  const isFavorite = useCallback((toolId: string) => favorites.includes(toolId), [favorites])

  const toggleFavorite = useCallback(
    (toolId: string) => {
      const willFavorite = !favorites.includes(toolId)
      setFavorites((current) =>
        current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId],
      )
      return willFavorite
    },
    [favorites],
  )

  const clearFavorites = useCallback(() => setFavorites([]), [])

  const recordVisit = useCallback((toolId: string) => {
    setRecent((current) => {
      const next = [{ id: toolId, at: Date.now() }, ...current.filter((entry) => entry.id !== toolId)]
      return next.slice(0, RECENT_LIMIT)
    })
  }, [])

  const clearRecent = useCallback(() => setRecent([]), [])

  const favoritesValue = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, clearFavorites }),
    [favorites, isFavorite, toggleFavorite, clearFavorites],
  )

  const recentValue = useMemo(
    () => ({ recent, recordVisit, clearRecent }),
    [recent, recordVisit, clearRecent],
  )

  return (
    <FavoritesContext.Provider value={favoritesValue}>
      <RecentContext.Provider value={recentValue}>{children}</RecentContext.Provider>
    </FavoritesContext.Provider>
  )
}

/* ------------------------------------------------------------------
 * 轻提示：复制成功 / 校验失败等操作反馈
 * ---------------------------------------------------------------- */

function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef<number[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++seq.current
      setItems((current) => [...current.slice(-2), { id, message, tone }])
      const timer = window.setTimeout(() => dismiss(id), TOAST_DURATION)
      timers.current.push(timer)
    },
    [dismiss],
  )

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
    }
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LibraryProvider>
        <ToastProvider>{children}</ToastProvider>
      </LibraryProvider>
    </ThemeProvider>
  )
}
