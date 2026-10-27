/**
 * JSON 处理的纯函数层：解析、格式化、压缩、错误定位。
 */

export interface JsonError {
  message: string
  /** 1 起始的行号 */
  line?: number
  /** 1 起始的列号 */
  column?: number
  /** 出错行原文，用于在界面上高亮 */
  excerpt?: string
}

export type JsonStatus =
  | { kind: 'empty' }
  | { kind: 'valid'; summary: string; lines: number; bytes: number }
  | { kind: 'invalid'; error: JsonError }

export type TransformResult = { ok: true; output: string } | { ok: false; error: JsonError }

export type IndentOption = 2 | 4 | 'tab'

export const INDENT_OPTIONS: { value: string; label: string; indent: IndentOption }[] = [
  { value: '2', label: '2 空格', indent: 2 },
  { value: '4', label: '4 空格', indent: 4 },
  { value: 'tab', label: 'Tab', indent: 'tab' },
]

export function byteLength(text: string): number {
  if (typeof TextEncoder === 'undefined') return text.length
  return new TextEncoder().encode(text).length
}

export function lineCount(text: string): number {
  return text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length
}

/** 从 V8 / JSC 各不相同的报错文案里尽量还原出行列位置 */
function locateError(input: string, message: string): JsonError {
  const positionMatch = /position\s+(\d+)/i.exec(message)
  const lineColumnMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message)

  let line: number | undefined
  let column: number | undefined

  if (lineColumnMatch) {
    line = Number(lineColumnMatch[1])
    column = Number(lineColumnMatch[2])
  } else if (positionMatch) {
    const offset = Math.min(Number(positionMatch[1]), input.length)
    const before = input.slice(0, offset)
    line = lineCount(before) || 1
    const lastBreak = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r'))
    column = offset - lastBreak
  }

  // 去掉「at position 12」这类只有引擎看得懂的尾巴，保留人类可读部分
  const cleanMessage = message.replace(/\s*in JSON at position\s*\d+/i, '').replace(/\s*at position\s*\d+/i, '')

  let excerpt: string | undefined
  if (line && line > 0) {
    excerpt = input.split(/\r\n|\r|\n/)[line - 1]
  }

  return { message: cleanMessage, line, column, excerpt }
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) return `数组 · ${value.length} 项`
  if (value === null) return 'null'
  if (typeof value === 'object') return `对象 · ${Object.keys(value as object).length} 个键`
  return `${typeof value} · ${String(value).slice(0, 24)}`
}

export function parseJson(input: string): { ok: true; value: unknown } | { ok: false; error: JsonError } {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: locateError(input, message) }
  }
}

export function inspectJson(input: string): JsonStatus {
  if (!input.trim()) return { kind: 'empty' }

  const parsed = parseJson(input)
  if (!parsed.ok) return { kind: 'invalid', error: parsed.error }

  return {
    kind: 'valid',
    summary: describeValue(parsed.value),
    lines: lineCount(input),
    bytes: byteLength(input),
  }
}

export function transform(input: string, mode: 'pretty' | 'minify', indent: IndentOption = 2): TransformResult {
  if (!input.trim()) {
    return { ok: false, error: { message: '内容为空，先粘贴一段 JSON。' } }
  }

  const parsed = parseJson(input)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  if (mode === 'minify') {
    return { ok: true, output: JSON.stringify(parsed.value) }
  }

  const space = indent === 'tab' ? '\t' : indent
  return { ok: true, output: JSON.stringify(parsed.value, null, space) }
}

/** 演示用的示例数据：结构简单，能一眼看出格式化的效果 */
export const JSON_SAMPLE = `{"name":"htools","version":"2.0.0","private":true,"tools":[{"id":"color-converter","category":"convert"},{"id":"json-formatter","category":"text"}],"features":{"offline":true,"backend":false}}`
