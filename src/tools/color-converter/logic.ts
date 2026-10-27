/**
 * 颜色转换的纯函数层。
 * 不碰 DOM、不依赖 React —— 方便单测，也方便别的工具复用。
 */

export interface RGBChannels {
  r: number
  g: number
  b: number
}

export interface HSLChannels {
  h: number
  s: number
  l: number
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl'

export interface ParsedColor {
  rgb: RGBChannels
  /** 输入被识别成的格式，用于回显 */
  format: ColorFormat
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function rgbToHex({ r, g, b }: RGBChannels): string {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function rgbToHsl({ r, g, b }: RGBChannels): HSLChannels {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

    if (max === rn) {
      h = (gn - bn) / delta + (gn < bn ? 6 : 0)
    } else if (max === gn) {
      h = (bn - rn) / delta + 2
    } else {
      h = (rn - gn) / delta + 4
    }
    h *= 60
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToRgb({ h, s, l }: HSLChannels): RGBChannels {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp(s, 0, 100) / 100
  const lightness = clamp(l, 0, 100) / 100

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - c / 2

  let rgb: [number, number, number]
  if (hue < 60) rgb = [c, x, 0]
  else if (hue < 120) rgb = [x, c, 0]
  else if (hue < 180) rgb = [0, c, x]
  else if (hue < 240) rgb = [0, x, c]
  else if (hue < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  }
}

/** CSS 里可用的写法，小数点后保留 1 位 */
export function formatRgb(rgb: RGBChannels): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

export function formatHsl(hsl: HSLChannels): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
// 允许逗号或空格分隔，也允许新版 CSS 的「空格 + / 透明度」写法
const RGB_PATTERN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+[\d.]+%?)?\s*\)$/i
const HSL_PATTERN =
  /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+[\d.]+%?)?\s*\)$/i

function expandShortHex(hex: string): string {
  return hex
    .split('')
    .map((char) => char + char)
    .join('')
}

/**
 * 解析用户输入：支持 #RGB / #RRGGBB（可省略 #）、rgb()/rgba()、hsl()/hsla()。
 * 解析失败返回 null，由调用方给出错误提示。
 */
export function parseColor(input: string): ParsedColor | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null

  const hexMatch = raw.match(HEX_PATTERN)
  if (hexMatch) {
    const hex = hexMatch[1].length === 3 ? expandShortHex(hexMatch[1]) : hexMatch[1]
    return {
      format: 'hex',
      rgb: {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      },
    }
  }

  const rgbMatch = raw.match(RGB_PATTERN)
  if (rgbMatch) {
    return {
      format: 'rgb',
      rgb: {
        r: clamp(Math.round(Number(rgbMatch[1])), 0, 255),
        g: clamp(Math.round(Number(rgbMatch[2])), 0, 255),
        b: clamp(Math.round(Number(rgbMatch[3])), 0, 255),
      },
    }
  }

  const hslMatch = raw.match(HSL_PATTERN)
  if (hslMatch) {
    return {
      format: 'hsl',
      rgb: hslToRgb({
        h: Number(hslMatch[1]),
        s: clamp(Number(hslMatch[2]), 0, 100),
        l: clamp(Number(hslMatch[3]), 0, 100),
      }),
    }
  }

  return null
}

/** 按感知亮度挑一个能读的文字颜色（用于色块上的大号 HEX 文本） */
export function readableTextColor({ r, g, b }: RGBChannels): '#000000' | '#FFFFFF' {
  // sRGB 相对亮度近似
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#FFFFFF'
}

export function randomHex(): string {
  const channel = () => Math.floor(Math.random() * 256)
  return rgbToHex({ r: channel(), g: channel(), b: channel() })
}

export const COLOR_EXAMPLE = '#3B82F6'
