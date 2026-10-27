/**
 * LocalStorage 封装。
 *
 * 所有读写都吞异常：Safari 无痕模式、禁用第三方 Cookie、配额写满、
 * 或者 localStorage 被浏览器策略直接屏蔽时，页面必须照常可用，
 * 只是这次会话不记状态。
 */

export const STORAGE_KEYS = {
  /** 与 index.html 里的首帧主题脚本共用同一个键，别改 */
  theme: 'htools:theme',
  /** 沿用 v1 的键，老的收藏记录可以继续用 */
  favorites: 'htools:favs',
  recent: 'htools:recent',
  viewMode: 'htools:view',
} as const

let availability: boolean | null = null

/** 探测 localStorage 是否真的可写（仅判断存在不够，Safari 无痕会抛异常） */
export function isStorageAvailable(): boolean {
  if (availability !== null) return availability
  try {
    const probe = '__htools_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    availability = true
  } catch {
    availability = false
  }
  return availability
}

export function readRaw(key: string): string | null {
  if (!isStorageAvailable()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeRaw(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    // 配额写满等情况：本次不持久化，但不打断使用
    return false
  }
}

export function removeRaw(key: string): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* 忽略 */
  }
}

/**
 * 读取并校验 JSON。
 * guard 返回 false 时退回 fallback —— 防止用户手改过存储、或旧版本数据格式不同导致整页崩溃。
 */
export function readJSON<T>(key: string, fallback: T, guard?: (value: unknown) => value is T): T {
  const raw = readRaw(key)
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (guard && !guard(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value))
  } catch {
    return false
  }
}
