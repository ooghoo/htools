/**
 * 图片水印的绘制与导出逻辑。
 * 与 React 无关：只接收 canvas / 图片 / 设置，产出像素或 Blob。
 */

export type WatermarkKind = 'text' | 'image'
export type WatermarkLayout = 'tile' | 'single'
export type WatermarkPos = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'
export type OutputSize = 'original' | 'half' | 'long' | 'custom'
export type OutputFormat = 'jpeg' | 'png'

export interface WatermarkSettings {
  kind: WatermarkKind
  text: string
  font: string
  weight: string
  /** 字号，按图片宽度的百分比 */
  size: number
  /** 字间距，em 倍数 */
  tracking: number
  color: string
  /** 按整图平均亮度自动切白字 / 深色字 */
  autoContrast: boolean
  opacity: number
  /** 描边粗细，按字号百分比 */
  stroke: number
  strokeColor: string
  shadow: boolean
  angle: number
  layout: WatermarkLayout
  pos: WatermarkPos
  gapX: number
  gapY: number
  logo: HTMLImageElement | null
  logoName: string
  /** Logo 宽度，按图片宽度百分比 */
  logoScale: number
}

export interface OutputSettings {
  size: OutputSize
  custom: number
  format: OutputFormat
  quality: number
}

export interface WatermarkItem {
  id: number
  name: string
  url: string
  img: HTMLImageElement
  w: number
  h: number
  /** 预览用的缩小图，避免每次都缩放大图 */
  preview: CanvasImageSource
  /** 整图平均亮度 0~1 */
  luma: number
}

export const FONTS: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  pingfang: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  songti: '"Songti SC", "Source Han Serif SC", "SimSun", serif',
  kaiti: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  yuanti: '"Yuanti SC", "STYuanti", "Hiragino Maru Gothic ProN", "Microsoft YaHei", sans-serif',
  helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
}

export const FONT_OPTIONS = [
  { value: 'system', label: '系统默认（苹方 / 思源）' },
  { value: 'pingfang', label: '苹方 PingFang SC' },
  { value: 'songti', label: '宋体 Songti SC' },
  { value: 'kaiti', label: '楷体 Kaiti SC' },
  { value: 'yuanti', label: '圆体 Yuanti SC' },
  { value: 'helvetica', label: 'Helvetica Neue' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'mono', label: '等宽 SF Mono' },
]

export const WEIGHT_OPTIONS = [
  { value: '300', label: '细体 Light' },
  { value: '400', label: '常规 Regular' },
  { value: '500', label: '中等 Medium' },
  { value: '600', label: '半粗 Semibold' },
  { value: '700', label: '粗体 Bold' },
  { value: '800', label: '特粗 Heavy' },
]

export const DEFAULT_WATERMARK: WatermarkSettings = {
  kind: 'text',
  text: '© 2026 · SAMPLE',
  font: 'system',
  weight: '600',
  size: 4.6,
  tracking: 0.04,
  color: '#ffffff',
  autoContrast: true,
  opacity: 55,
  stroke: 0,
  strokeColor: '#000000',
  shadow: true,
  angle: -30,
  layout: 'tile',
  pos: 'br',
  gapX: 1.2,
  gapY: 1.7,
  logo: null,
  logoName: '',
  logoScale: 14,
}

export const DEFAULT_OUTPUT: OutputSettings = {
  size: 'original',
  custom: 1600,
  format: 'jpeg',
  quality: 100,
}

export const SWATCHES = ['#ffffff', '#000000', '#8e8e93', '#0071e3', '#ff3b30']
export const ANGLE_PRESETS = [-45, -30, 0, 30, 45]
export const MAX_PIXELS = 16777216 // Safari 画布安全上限

export interface Preset {
  name: string
  patch: Partial<WatermarkSettings>
}

export const PRESETS: Preset[] = [
  { name: '斜向密铺', patch: { layout: 'tile', angle: -30, size: 4.6, opacity: 55, gapX: 1.2, gapY: 1.7, color: '#ffffff', shadow: true, tracking: 0.04 } },
  { name: '水平密铺', patch: { layout: 'tile', angle: 0, size: 4, opacity: 55, gapX: 1.6, gapY: 1.6, color: '#ffffff', shadow: true, tracking: 0.06 } },
  { name: '右下角', patch: { layout: 'single', pos: 'br', angle: 0, size: 3.4, opacity: 85, color: '#ffffff', shadow: true, tracking: 0.02 } },
  { name: '底部居中', patch: { layout: 'single', pos: 'bc', angle: 0, size: 3.6, opacity: 80, color: '#ffffff', shadow: true, tracking: 0.06 } },
  { name: '居中大字', patch: { layout: 'single', pos: 'mc', angle: 0, size: 11, opacity: 40, color: '#ffffff', shadow: true, tracking: 0.14 } },
]

/* ------------------------------------------------------------------ */

function rgba(hex: string, alpha: number): string {
  let value = String(hex || '#ffffff').replace('#', '')
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2]
  }
  let parsed = parseInt(value, 16)
  if (Number.isNaN(parsed)) parsed = 0xffffff
  return `rgba(${(parsed >> 16) & 255},${(parsed >> 8) & 255},${parsed & 255},${alpha})`
}

function measureLine(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  const chars = Array.from(text)
  if (!tracking) return ctx.measureText(text).width
  let width = 0
  for (const char of chars) width += ctx.measureText(char).width
  return width + tracking * Math.max(0, chars.length - 1)
}

function paintLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  style: WatermarkSettings,
  tracking: number,
  size: number,
): void {
  const hasStroke = style.stroke > 0
  if (hasStroke) {
    ctx.lineWidth = Math.max(0.5, (size * style.stroke) / 100)
    ctx.strokeStyle = rgba(style.strokeColor, style.opacity / 100)
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
  }

  if (!tracking) {
    if (hasStroke) ctx.strokeText(text, cx, cy)
    ctx.fillText(text, cx, cy)
    return
  }

  const chars = Array.from(text)
  const total = measureLine(ctx, text, tracking)
  let x = cx - total / 2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (const char of chars) {
    if (hasStroke) ctx.strokeText(char, x, cy)
    ctx.fillText(char, x, cy)
    x += ctx.measureText(char).width + tracking
  }
  ctx.textAlign = prevAlign
}

interface WatermarkUnit {
  w: number
  h: number
  draw: (cx: number, cy: number) => void
}

/** 构建一个水印单元：尺寸 + 在指定中心点绘制的方法 */
function buildUnit(
  ctx: CanvasRenderingContext2D,
  width: number,
  settings: WatermarkSettings,
  luma: number,
): WatermarkUnit | null {
  if (settings.kind === 'image') {
    const logo = settings.logo
    if (!logo) return null
    const lw = (width * settings.logoScale) / 100
    const lh = lw * (logo.naturalHeight / logo.naturalWidth)
    return {
      w: lw,
      h: lh,
      draw: (cx, cy) => {
        ctx.save()
        ctx.globalAlpha = settings.opacity / 100
        if (settings.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,.28)'
          ctx.shadowBlur = lw * 0.06
          ctx.shadowOffsetY = lw * 0.015
        }
        ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh)
        ctx.restore()
      },
    }
  }

  const size = Math.max(6, (width * settings.size) / 100)
  const tracking = settings.tracking * size

  // 自动对比：按整图平均亮度切换白字 / 深色字
  const auto = settings.autoContrast && typeof luma === 'number'
  const darkText = auto && luma > 0.5
  const style: WatermarkSettings = auto
    ? { ...settings, color: darkText ? '#111111' : '#ffffff', strokeColor: darkText ? '#ffffff' : '#111111' }
    : settings

  ctx.font = `${settings.weight} ${size}px ${FONTS[settings.font] || FONTS.system}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = String(settings.text && settings.text.length ? settings.text : ' ').split('\n')
  const lineHeight = size * 1.34
  const widths = lines.map((line) => measureLine(ctx, line, tracking))
  const unitWidth = Math.max(...widths.concat([size * 0.6]))
  const unitHeight = lineHeight * (lines.length - 1) + size

  return {
    w: unitWidth,
    h: unitHeight,
    draw: (cx, cy) => {
      ctx.save()
      ctx.font = `${settings.weight} ${size}px ${FONTS[settings.font] || FONTS.system}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(style.color, style.opacity / 100)
      if (settings.shadow) {
        ctx.shadowColor = auto && darkText ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.5)'
        ctx.shadowBlur = size * 0.3
        ctx.shadowOffsetY = size * 0.04
      }
      lines.forEach((line, index) => {
        const y = cy - unitHeight / 2 + size / 2 + index * lineHeight
        paintLine(ctx, line, cx, y, style, tracking, size)
      })
      ctx.restore()
    },
  }
}

function clampAxis(value: number, half: number, total: number): number {
  if (half * 2 >= total) return total / 2
  return Math.min(Math.max(value, half), total - half)
}

/** 在给定上下文里画水印；preview 与导出共用同一套算法，只是画布尺寸不同 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings,
  luma: number,
): void {
  if (!width || !height) return
  const unit = buildUnit(ctx, width, settings, luma)
  if (!unit || unit.w <= 0 || unit.h <= 0) return

  const rad = (settings.angle * Math.PI) / 180

  if (settings.layout === 'tile') {
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(rad)
    const diagonal = Math.sqrt(width * width + height * height)
    const stepX = unit.w + Math.max(unit.w * settings.gapX, width * 0.015)
    const stepY = unit.h + Math.max(unit.h * settings.gapY, width * 0.018)
    const cols = Math.ceil(diagonal / stepX) + 2
    const rows = Math.ceil(diagonal / stepY) + 2
    const x0 = -((cols - 1) * stepX) / 2
    const y0 = -((rows - 1) * stepY) / 2
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 ? stepX / 2 : 0
      for (let col = 0; col < cols; col += 1) {
        unit.draw(x0 + col * stepX + offset, y0 + row * stepY)
      }
    }
    ctx.restore()
    return
  }

  // 单个水印：按旋转后的包围盒算九宫格位置
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const boxW = unit.w * cos + unit.h * sin
  const boxH = unit.w * sin + unit.h * cos
  const pad = Math.min(width, height) * 0.045
  const pos = settings.pos || 'br'
  const rowKey = pos.charAt(0)
  const colKey = pos.charAt(1)

  let cx = width / 2
  if (colKey === 'l') cx = pad + boxW / 2
  else if (colKey === 'r') cx = width - pad - boxW / 2

  let cy = height / 2
  if (rowKey === 't') cy = pad + boxH / 2
  else if (rowKey === 'b') cy = height - pad - boxH / 2

  cx = clampAxis(cx, boxW / 2, width)
  cy = clampAxis(cy, boxH / 2, height)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rad)
  unit.draw(0, 0)
  ctx.restore()
}

/* ---------------- 图片读取 ---------------- */

/** 整图平均感知亮度，用于自动对比 */
export function averageLuma(source: CanvasImageSource): number {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0.5
    ctx.drawImage(source, 0, 0, 16, 16)
    const data = ctx.getImageData(0, 0, 16, 16).data
    let sum = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255
      if (alpha < 0.1) continue
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
      count += 1
    }
    return count ? sum / count : 0.5
  } catch {
    return 0.5
  }
}

/** 预览用缩小图：小图直接用原图，大图缩到长边 1800 */
export function downscale(img: HTMLImageElement, maxSide: number): CanvasImageSource {
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  if (ratio >= 1) return img
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio))
  const ctx = canvas.getContext('2d')
  if (!ctx) return img
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function loadImageFile(file: File | Blob): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/* ---------------- 导出 ---------------- */

export function targetSize(
  width: number,
  height: number,
  output: OutputSettings,
): { w: number; h: number } {
  let scale = 1
  if (output.size === 'half') scale = 0.5
  else if (output.size === 'long') scale = 1080 / Math.max(width, height)
  else if (output.size === 'custom') {
    const longSide = Math.max(64, Math.min(8000, output.custom || 1600))
    scale = longSide / Math.max(width, height)
  }

  let tw = Math.max(1, Math.round(width * scale))
  let th = Math.max(1, Math.round(height * scale))

  if (tw * th > MAX_PIXELS) {
    const k = Math.sqrt(MAX_PIXELS / (tw * th))
    tw = Math.max(1, Math.floor(tw * k))
    th = Math.max(1, Math.floor(th * k))
  }

  return { w: tw, h: th }
}

export function exportBlob(
  item: WatermarkItem,
  target: { w: number; h: number },
  settings: WatermarkSettings,
  output: OutputSettings,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = target.w
  canvas.height = target.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (output.format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, target.w, target.h)
  }
  ctx.drawImage(item.img, 0, 0, target.w, target.h)
  drawWatermark(ctx, target.w, target.h, settings, item.luma)

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0
        canvas.height = 0
        resolve(blob)
      },
      output.format === 'png' ? 'image/png' : 'image/jpeg',
      output.quality / 100,
    )
  })
}

export function baseName(name: string): string {
  return String(name || 'image').replace(/\.[^.]+$/, '') || 'image'
}

export function outputName(item: WatermarkItem, output: OutputSettings): string {
  const ext = output.format === 'png' ? 'png' : 'jpg'
  return `${baseName(item.name)}-watermark.${ext}`
}

export function stamp(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  )
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 4000)
}

/* ---------------- ZIP 打包（store 模式，手写实现，不依赖 CDN） ---------------- */

let crcTable: Uint32Array | null = null

function crc32(buffer: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c >>> 0
    }
  }

  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

export function makeZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const now = new Date()
  const time =
    ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() / 2) & 31)
  const date =
    (((now.getFullYear() - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31)

  const parts: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 文件名
    lv.setUint16(8, 0, true)
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)

    parts.push(local, entry.data)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, name.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint32(36, 0, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)

    offset += local.length + size
  }

  const centralSize = centrals.reduce((sum, chunk) => sum + chunk.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const all = [...parts, ...centrals, end]
  const total = all.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let position = 0
  for (const chunk of all) {
    output.set(chunk, position)
    position += chunk.length
  }

  return output
}
