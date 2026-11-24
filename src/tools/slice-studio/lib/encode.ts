/**
 * 切片编码：把「原图 + 原图像素矩形」画进一张恰好同尺寸的画布，再编码为 Blob。
 *
 * 关键约束：
 *  - 目标画布宽高 = 切片宽高，drawImage 的源/目标尺寸一致，不做任何缩放；
 *  - PNG / WebP 保留透明通道，JPG 先用背景色铺底再绘制；
 *  - 不支持的编码会被明确识别并报错，而不是静默导出成 PNG。
 */

import { MAX_CANVAS_PIXELS, MAX_CANVAS_SIDE, MIME_BY_FORMAT } from './constants.ts'
import type { EncodeOptions, ExportSettings, OutputFormat, Rect } from '../types.ts'

/** 两种 2D context 共有的最小接口，避免联合类型调用 drawImage 时的签名冲突 */
interface SliceContext {
  fillStyle: string
  imageSmoothingEnabled: boolean
  clearRect(x: number, y: number, w: number, h: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
}

export function encodeOptionsFromSettings(settings: ExportSettings, format?: OutputFormat): EncodeOptions {
  const finalFormat = format ?? settings.format
  return {
    mime: MIME_BY_FORMAT[finalFormat],
    quality: settings.quality,
    background: finalFormat === 'jpeg' ? settings.background : null,
  }
}

export function assertCanvasSize(rect: Rect): void {
  if (rect.w <= 0 || rect.h <= 0) throw new Error('切片尺寸无效（宽或高为 0）。')
  if (rect.w > MAX_CANVAS_SIDE || rect.h > MAX_CANVAS_SIDE) {
    throw new Error('单个切片边长超过浏览器画布上限，请增加切割数量。')
  }
  if (rect.w * rect.h > MAX_CANVAS_PIXELS) {
    throw new Error('单个切片像素数超过浏览器画布上限，请增加切割数量。')
  }
}

export function paintSlice(
  context: SliceContext,
  source: CanvasImageSource,
  rect: Rect,
  options: EncodeOptions,
): void {
  assertCanvasSize(rect)
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, rect.w, rect.h)
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, rect.w, rect.h)
  }
  context.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
}

function verifyEncodedType(blob: Blob, mime: string): void {
  if (mime === 'image/png' || !blob.type || blob.type === mime) return
  const label = mime === 'image/webp' ? 'WebP' : 'JPG'
  throw new Error(`当前浏览器不支持 ${label} 编码，请改用 PNG 或切换浏览器。`)
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败，浏览器未返回数据。'))),
      mime,
      quality,
    )
  })
}

/** 主线程：单张下载 / Worker 不可用时的降级路径 */
export async function encodeSliceOnMain(
  source: HTMLImageElement,
  rect: Rect,
  options: EncodeOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = rect.w
  canvas.height = rect.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 上下文，请检查浏览器设置。')
  paintSlice(ctx as unknown as SliceContext, source, rect, options)
  try {
    const blob = await canvasToBlob(canvas, options.mime, options.quality)
    verifyEncodedType(blob, options.mime)
    return blob
  } finally {
    // 立刻释放这块可能很大的画布内存
    canvas.width = 0
    canvas.height = 0
  }
}

/** Worker 内：复用同一张 OffscreenCanvas，逐张设置尺寸并编码 */
export async function encodeSliceOffscreen(
  source: ImageBitmap,
  canvas: OffscreenCanvas,
  rect: Rect,
  options: EncodeOptions,
): Promise<Blob> {
  assertCanvasSize(rect)
  canvas.width = rect.w
  canvas.height = rect.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 OffscreenCanvas 上下文。')
  paintSlice(ctx as unknown as SliceContext, source, rect, options)
  const blob = await canvas.convertToBlob({ type: options.mime, quality: options.quality })
  verifyEncodedType(blob, options.mime)
  return blob
}
