/**
 * 导出 Worker：在后台线程完成「解码 → 逐张编码 → 打包 ZIP」，主线程不卡顿。
 *
 * 只接收本地 Blob（结构化克隆，不复制底层数据）与原图像素矩形；
 * 全程不发网络请求。浏览器能力不足时通知主线程降级，而不是静默失败。
 */

import JSZip from 'jszip'
import { encodeSliceOffscreen } from '../lib/encode.ts'
import type { ExportProgress, WorkerRequest, WorkerResponse } from '../types.ts'

interface WorkerPort {
  postMessage(message: WorkerResponse): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

const port = globalThis as unknown as WorkerPort

/** 能力缺失 / 解码失败：主线程可以用已解码的 HTMLImageElement 再试一次 */
class FallbackError extends Error {}

function post(progress: ExportProgress): void {
  port.postMessage({ type: 'progress', progress })
}

port.onmessage = async (event) => {
  const request = event.data
  if (!request || request.type !== 'export') return

  let bitmap: ImageBitmap | null = null
  let canvas: OffscreenCanvas | null = null

  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
      throw new FallbackError('当前环境缺少 OffscreenCanvas 或 createImageBitmap')
    }

    try {
      bitmap = await createImageBitmap(request.blob)
    } catch {
      throw new FallbackError('后台解码失败，改用主线程已解码的图片')
    }

    canvas = new OffscreenCanvas(1, 1)
    const zip = new JSZip()
    const entries = request.entries
    const total = entries.length
    const step = Math.max(1, Math.floor(total / 25))

    for (let i = 0; i < total; i += 1) {
      const entry = entries[i]
      const blob = await encodeSliceOffscreen(bitmap, canvas, entry.rect, request.options)
      zip.file(entry.filename, blob, { binary: true })
      if (i % step === 0 || i === total - 1) {
        post({ phase: 'encoding', current: i + 1, total, percent: ((i + 1) / total) * 0.9 })
      }
    }

    const archive = await zip.generateAsync(
      { type: 'blob', compression: 'STORE', mimeType: 'application/zip' },
      (meta) => {
        post({ phase: 'packing', current: total, total, percent: 0.9 + (meta.percent / 100) * 0.1 })
      },
    )

    post({ phase: 'packing', current: total, total, percent: 1 })
    port.postMessage({ type: 'done', blob: archive, count: total })
  } catch (error) {
    port.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : '导出过程中发生未知错误',
      fallback: error instanceof FallbackError,
    })
  } finally {
    bitmap?.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
