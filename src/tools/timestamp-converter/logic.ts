/** 时间戳 / 日期互转的纯函数层。 */

export type TimestampUnit = 's' | 'ms'

export const UNIT_OPTIONS: { value: TimestampUnit; label: string }[] = [
  { value: 's', label: '秒' },
  { value: 'ms', label: '毫秒' },
]

/** JS Date 能表示的极限，超出就是 Invalid Date */
const MAX_MS = 8.64e15

export function nowMs(): number {
  return Date.now()
}

function pad(value: number, length = 2): string {
  return String(Math.abs(value)).padStart(length, '0')
}

export interface ParseResult {
  ok: boolean
  ms?: number
  error?: string
}

/** 解析时间戳输入：只接受整数（可带正负号），按所选单位解释 */
export function parseTimestamp(input: string, unit: TimestampUnit): ParseResult {
  const raw = input.trim()
  if (!raw) return { ok: false, error: '' }

  if (!/^-?\d+$/.test(raw)) {
    return { ok: false, error: '时间戳必须是整数（秒或毫秒），不要带小数、空格或单位。' }
  }

  const ms = unit === 's' ? Number(raw) * 1000 : Number(raw)
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) {
    return { ok: false, error: '超出可表示范围（约公元 ±275760 年）。' }
  }

  return { ok: true, ms }
}

/** 本地时区时间：YYYY-MM-DD HH:mm:ss */
export function formatLocal(ms: number): string {
  const date = new Date(ms)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** UTC 时间：YYYY-MM-DD HH:mm:ss UTC */
export function formatUtc(ms: number): string {
  const date = new Date(ms)
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  )
}

/** ISO 8601（带毫秒） */
export function formatIso(ms: number): string {
  return new Date(ms).toISOString()
}

export function toSeconds(ms: number): number {
  return Math.floor(ms / 1000)
}

/** 本地时区名 + 偏移，例如 Asia/Shanghai · UTC+08:00 */
export function timezoneInfo(ms: number = Date.now()): { zone: string; offset: string } {
  let zone = '本地时区'
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || zone
  } catch {
    /* 个别环境拿不到时区名，保留兜底文案 */
  }

  const minutes = -new Date(ms).getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const offset = `UTC${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`

  return { zone, offset }
}

/** 把 datetime-local 的值（本地时间）转成毫秒；非法日期返回 null */
export function parseLocalDateTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? 0)

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null
  }

  const date = new Date(year, month - 1, day, hour, minute, second, 0)
  // 拦住 2 月 31 日这类会被 Date 自动进位的输入
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null
  }

  return date.getTime()
}

/** 当前时间对应的 datetime-local 字符串 */
export function toDateTimeLocalValue(ms: number): string {
  const date = new Date(ms)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
