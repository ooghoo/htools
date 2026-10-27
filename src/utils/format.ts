/** 通用数值格式化 */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB']

/** 人类可读的字节数（1024 进制），用于「输入大小」这类展示 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${BYTE_UNITS[unit]}`
}

/** 数字加千分位 */
export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
