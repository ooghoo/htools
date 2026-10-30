/** 字节换算纯逻辑：一个输入值，同时给出 1024 与 1000 两种进制下所有单位的值 */

export interface ByteUnit {
  key: string
  name: string
  sym: string
  /** 相对字节的 10^n 次幂；bit 特殊处理，用 null 表示 */
  power: number | null
}

export const BYTE_UNITS: ByteUnit[] = [
  { key: 'bit', name: '比特', sym: 'bit', power: null },
  { key: 'B', name: '字节', sym: 'B', power: 0 },
  { key: 'KB', name: '千字节', sym: 'KB', power: 1 },
  { key: 'MB', name: '兆字节', sym: 'MB', power: 2 },
  { key: 'GB', name: '千兆字节', sym: 'GB', power: 3 },
  { key: 'TB', name: '太字节', sym: 'TB', power: 4 },
  { key: 'PB', name: '拍字节', sym: 'PB', power: 5 },
  { key: 'EB', name: '艾字节', sym: 'EB', power: 6 },
  { key: 'ZB', name: '泽字节', sym: 'ZB', power: 7 },
  { key: 'YB', name: '尧字节', sym: 'YB', power: 8 },
]

export interface BaseDef {
  key: 'binary' | 'decimal'
  label: string
  short: string
  base: number
}

export const BASES: BaseDef[] = [
  { key: 'binary', label: '二进制 · 1024', short: '1024', base: 1024 },
  { key: 'decimal', label: '十进制 · 1000', short: '1000', base: 1000 },
]

/** 默认展示到 PB，更大的单位（EB / ZB / YB）折叠在「展开全部」里 */
export const DEFAULT_VISIBLE = 7

/** 小数位档位：设计稿里的 2 / 4 / 6 */
export type Decimals = 2 | 4 | 6

export const DECIMAL_OPTIONS: { value: Decimals; label: string }[] = [
  { value: 2, label: '2' },
  { value: 4, label: '4' },
  { value: 6, label: '6' },
]

export function factorOf(unit: ByteUnit, base: number): number {
  // 1 Byte = 8 bit
  if (unit.power === null) return 1 / 8
  return Math.pow(base, unit.power)
}

/**
 * 把 value 从 fromUnit 换算到所有单位。
 * 返回按 BYTE_UNITS 顺序排列的数值数组，每个元素对应一种进制。
 */
export function convertAll(value: number, fromUnit: ByteUnit): Record<string, number[]> {
  const result: Record<string, number[]> = {}

  for (const unit of BYTE_UNITS) {
    result[unit.key] = BASES.map((baseDef) => {
      const bytes = value * factorOf(fromUnit, baseDef.base)
      return bytes / factorOf(unit, baseDef.base)
    })
  }

  return result
}

/**
 * 统一数字格式。
 * - 按所选小数位补零，整数部分带千分位；
 * - 小到四舍五入会变成 0.00… 的数值改用科学计数法，信息不丢；极大值同理。
 */
export function formatByteValue(value: number, decimals: Decimals = 2): string {
  if (value === 0) return (0).toFixed(decimals)
  if (!Number.isFinite(value)) return '—'

  const abs = Math.abs(value)
  const halfUnit = Math.pow(10, -decimals) / 2
  if (abs < halfUnit || abs >= 1e15) {
    return value.toExponential(decimals).replace('e+', 'e')
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function parseAmount(input: string): number | null {
  const raw = input.trim().replace(/,/g, '')
  if (!raw) return null
  if (!/^-?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(raw)) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/* ---------------- 历史记录（仅当前会话，不落盘） ---------------- */

export interface HistoryEntry {
  /** 唯一键，用于 React key 与去重 */
  key: string
  /** 回填到输入框的原始数值字符串 */
  value: string
  unitKey: string
  /** 芯片上显示的文案 */
  label: string
}

export const HISTORY_LIMIT = 4

/** 把一次输入并入历史：去重、置顶、限长 */
export function pushHistory(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const rest = list.filter((item) => item.key !== entry.key)
  return [entry, ...rest].slice(0, HISTORY_LIMIT)
}

/* ---------------- 右侧说明栏 ---------------- */

/** 常用对照：二进制下 1 KB / 1 MB / 1 GB 到底是多少字节 */
export const QUICK_REFERENCE = [
  { from: '1 KB', bytes: 1024 },
  { from: '1 MB', bytes: 1024 ** 2 },
  { from: '1 GB', bytes: 1024 ** 3 },
]

/** 十进制 1000 相对二进制 1024 的占比，用于说明卡里的对比条 */
export const DECIMAL_RATIO = 1000 / 1024
