/**
 * 导出命名（纯函数）。
 * 编号始终由切片的自然顺序（左→右、上→下）决定；正序 / 逆序只改变编号方向。
 * ZIP 内的条目按导出编号升序写入，保证「按编号顺序导出」。
 */

import { EXT_BY_FORMAT, FORMAT_LABEL } from './constants.ts'
import type { ExportSettings, SliceFile, SliceRegion } from '../types.ts'

/** 去掉文件名里的非法字符与首尾空白；Windows / macOS 通用 */
export function sanitizePrefix(prefix: string): string {
  const cleaned = Array.from(prefix)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
  return cleaned
}

export function sourceBaseName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, '')
  return sanitizePrefix(withoutExt) || 'image'
}

/** 用户没填前缀时，用原图文件名派生一个（带分隔符） */
export function effectivePrefix(settings: ExportSettings, sourceName: string): string {
  const typed = sanitizePrefix(settings.prefix)
  return typed || `${sourceBaseName(sourceName)}-`
}

export function padNumber(value: number, mode: ExportSettings['padding'], total: number): string {
  if (mode === 'none') return String(value)
  // 自动模式至少补到 2 位（01、02…），切片过百时再自动升到 3 位
  const digits = mode === 'auto' ? Math.max(2, String(total).length) : Number(mode)
  return String(value).padStart(digits, '0')
}

export function buildSliceFiles(
  regions: SliceRegion[],
  settings: ExportSettings,
  sourceName: string,
): SliceFile[] {
  const prefix = effectivePrefix(settings, sourceName)
  const total = regions.length
  const ext = EXT_BY_FORMAT[settings.format]

  return regions.map((region) => {
    const sequence = settings.order === 'asc' ? region.index + 1 : total - region.index
    return {
      region,
      sequence,
      filename: `${prefix}${padNumber(sequence, settings.padding, total)}.${ext}`,
    }
  })
}

/** ZIP 内条目顺序：始终按导出编号 1 → N */
export function sortBySequence(files: SliceFile[]): SliceFile[] {
  return [...files].sort((a, b) => a.sequence - b.sequence)
}

export function zipFilename(
  settings: ExportSettings,
  sourceName: string,
  count: number,
): string {
  const typed = sanitizePrefix(settings.prefix)
  const base = typed ? typed.replace(/[-_\s]+$/, '') : sourceBaseName(sourceName)
  return `${base}-${count}-${FORMAT_LABEL[settings.format].toLowerCase()}.zip`
}
