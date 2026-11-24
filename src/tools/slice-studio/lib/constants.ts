import type { ExportSettings, OutputFormat } from '../types.ts'

/** 行数 / 列数上限；两个方向相乘再受 MAX_SLICES 约束 */
export const MAX_AXIS = 20
export const MAX_SLICES = 400

/** 浏览器解码与画布的安全边界，超出时给出明确错误而不是静默失败 */
export const MAX_FILE_BYTES = 80 * 1024 * 1024
export const MAX_SOURCE_PIXELS = 100_000_000
/** Safari / iOS 上单张 canvas 的稳妥上限（与仓库内水印工具一致） */
export const MAX_CANVAS_PIXELS = 16_777_216
export const MAX_CANVAS_SIDE = 16_384

export const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const EXT_BY_FORMAT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

export const FORMAT_LABEL: Record<OutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WebP',
}

export const DEFAULT_EXPORT: ExportSettings = {
  format: 'png',
  quality: 0.92,
  background: '#ffffff',
  prefix: '',
  padding: 'auto',
  order: 'asc',
}

export const GRID_PRESETS: { label: string; rows: number; cols: number }[] = [
  { label: '2 × 2', rows: 2, cols: 2 },
  { label: '3 × 3', rows: 3, cols: 3 },
  { label: '3 × 4', rows: 3, cols: 4 },
  { label: '4 × 4', rows: 4, cols: 4 },
  { label: '横向 3 段', rows: 3, cols: 1 },
  { label: '纵向 3 段', rows: 1, cols: 3 },
]

export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
