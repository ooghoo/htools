/** Base64 编解码纯逻辑：UTF-8 感知，编码/解码都为纯函数，便于单测与复用 */

export type Base64Mode = 'encode' | 'decode'

export interface Base64Result {
  ok: boolean
  output: string
  error?: string
}

const STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 字节数组 → 标准 Base64（必然成功，仅处理 0–255 的整数） */
function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    const n = (b0 << 16) | (b1 << 8) | b2
    out += STANDARD[(n >> 18) & 63]
    out += STANDARD[(n >> 12) & 63]
    out += i + 1 < bytes.length ? STANDARD[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? STANDARD[n & 63] : '='
  }
  return out
}

/** 标准 Base64（已补 =） → 字节数组；遇到非法字符跳过，由调用方先校验 */
function base64ToBytes(input: string): Uint8Array {
  const lookup = new Int8Array(256).fill(-1)
  for (let i = 0; i < STANDARD.length; i++) lookup[STANDARD.charCodeAt(i)] = i
  const clean = input.replace(/=/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8))
  let buffer = 0
  let bits = 0
  let pos = 0
  for (let i = 0; i < clean.length; i++) {
    const v = lookup[clean.charCodeAt(i)]
    if (v === -1) continue
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[pos++] = (buffer >> bits) & 0xff
    }
  }
  return out
}

/** 每 width 字符插入换行（MIME 标准 76） */
function wrap(str: string, width = 76): string {
  const re = new RegExp(`.{1,${width}}`, 'g')
  return str.match(re)?.join('\n') ?? str
}

/**
 * 编码：任意字符串 → Base64。
 * 先走 TextEncoder 得到 UTF-8 字节，保证中文 / emoji 正确。
 * urlSafe：把 + / 换成 - _ 并去掉末尾 =；wrap：每 76 字符换行。
 */
export function encodeBase64(
  input: string,
  opts: { urlSafe?: boolean; wrap?: boolean } = {},
): Base64Result {
  try {
    const bytes = new TextEncoder().encode(input)
    let b64 = bytesToBase64(bytes)
    if (opts.urlSafe) {
      b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }
    if (opts.wrap) b64 = wrap(b64)
    return { ok: true, output: b64 }
  } catch {
    return { ok: false, output: '', error: '编码失败：输入包含无法处理的字符。' }
  }
}

/**
 * 解码：Base64 → 字符串，宽松接受标准与 URL 安全两种写法，并自动忽略空白与换行。
 * 校验失败（非法字符 / 长度不合法）返回 ok:false 与中文错误提示；
 * 合法但字节不是合法 UTF-8 时仍尽力解码，不报错（与浏览器原生行为一致）。
 */
export function decodeBase64(input: string): Base64Result {
  const cleaned = input.replace(/\s+/g, '')
  if (cleaned.length === 0) return { ok: true, output: '' }

  // 先归一：- / _ 统一成 + /，再校验字母表
  const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  if (/[^A-Za-z0-9+/=]/.test(normalized)) {
    return {
      ok: false,
      output: '',
      error: '含非法字符：Base64 仅允许 A–Z a–z 0–9 + / =（URL 安全为 - _）。',
    }
  }

  // 长度补 = 后才合法：余 1 必然非法，余 2/3 需补 1/2 个 =
  const pad = normalized.length % 4
  if (pad === 1) {
    return { ok: false, output: '', error: '长度不合法：去掉空白后，Base64 长度应为 4 的倍数。' }
  }
  const padded = pad === 2 ? `${normalized}==` : pad === 3 ? `${normalized}=` : normalized

  try {
    const bytes = base64ToBytes(padded)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return { ok: true, output: text }
  } catch {
    return { ok: false, output: '', error: '解码失败：数据损坏或不是合法 Base64。' }
  }
}

/** 字符串的 UTF-8 字节数，用于输入 / 输出大小展示 */
export function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

/**
 * 把选中的文件（通常是图片）原始字节转成 Base64。
 * 用于「上传图片」入口：拿到的是文件字节的 Base64，不带 data URL 前缀。
 * 浏览器标准 File.arrayBuffer 即可，无需额外依赖。
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return bytesToBase64(new Uint8Array(buffer))
}

/** 示例：一段中文，用来演示 UTF-8 编码效果 */
export const SAMPLE_TEXT =
  'Base64 是一种基于 64 个可打印字符的编码方式，常用于在 HTTP、邮件等场景中传输二进制数据。'

export const SAMPLE_BASE64 = encodeBase64(SAMPLE_TEXT).output
