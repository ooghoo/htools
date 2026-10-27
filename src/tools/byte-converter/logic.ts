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

/** 默认展开到 EB，更大的单位（ZB / YB）折叠起来 */
export const DEFAULT_VISIBLE = 8

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

/** 统一数字格式：2 位小数；小于 0.005 或大于 1e15 时改用科学计数法，避免被显示成 0.00 */
export function formatByteValue(value: number): string {
  if (value === 0) return '0.00'
  if (!Number.isFinite(value)) return '—'

  const abs = Math.abs(value)
  // 阈值取 0.005：再小的话四舍五入到两位小数就成了 0.00，信息全丢
  if (abs < 0.005 || abs >= 1e15) {
    return value.toExponential(2).replace('e+', 'e')
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseAmount(input: string): number | null {
  const raw = input.trim().replace(/,/g, '')
  if (!raw) return null
  if (!/^-?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(raw)) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
