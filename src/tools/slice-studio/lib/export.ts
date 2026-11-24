/**
 * 批量导出编排：优先把编码 + ZIP 打包放进 Web Worker；
 * 能力不足时自动降级到主线程（分批让出事件循环，避免页面假死）。
 */

import JSZip from 'jszip'
import { encodeOptionsFromSettings, encodeSliceOnMain } from './encode.ts'
import { sortBySequence, zipFilename } from './naming.ts'
import type {
  EncodeOptions,
  ExportProgress,
  ExportResult,
  ExportSettings,
  ImageSource,
  SliceFile,
  WorkerEntry,
  WorkerRequest,
  WorkerResponse,
} from '../types.ts'

export class ExportCancelledError extends Error {
  constructor() {
    super('导出已取消')
    this.name = 'ExportCancelledError'
  }
}

class FallbackNeeded extends Error {}

export function isExportCancelled(error: unknown): boolean {
  return error instanceof ExportCancelledError
}

function supportsWorker(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  )
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0))
}

function packProgress(percent: number, total: number): ExportProgress {
  return { phase: 'packing', current: total, total, percent: 0.9 + (percent / 100) * 0.1 }
}

/** Worker 路径：主线程只负责转发进度，图片数据不经过任何网络层 */
function runWorker(
  request: WorkerRequest,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('../workers/export.worker.ts', import.meta.url), {
        type: 'module',
      })
    } catch {
      reject(new FallbackNeeded('无法创建后台导出线程'))
      return
    }

    let settled = false
    const onAbort = () => finish(() => reject(new ExportCancelledError()))
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      worker.terminate()
      action()
    }

    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (message.type === 'progress') {
        onProgress(message.progress)
        return
      }
      if (message.type === 'done') {
        finish(() => resolve(message.blob))
        return
      }
      finish(() =>
        reject(message.fallback ? new FallbackNeeded(message.message) : new Error(message.message)),
      )
    }
    worker.onerror = () => finish(() => reject(new FallbackNeeded('后台导出线程加载失败')))
    worker.onmessageerror = () => finish(() => reject(new FallbackNeeded('后台线程消息解析失败')))
    worker.postMessage(request)
  })
}

/** 降级路径：主线程分批编码，每几张让出一次事件循环 */
async function runMain(
  source: ImageSource,
  entries: WorkerEntry[],
  options: EncodeOptions,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const zip = new JSZip()
  const total = entries.length

  for (let i = 0; i < total; i += 1) {
    if (signal.aborted) throw new ExportCancelledError()
    const entry = entries[i]
    const blob = await encodeSliceOnMain(source.image, entry.rect, options)
    zip.file(entry.filename, blob, { binary: true })
    onProgress({
      phase: 'encoding',
      current: i + 1,
      total,
      percent: ((i + 1) / total) * 0.9,
    })
    if (i % 3 === 2) await yieldToUI()
  }

  return zip.generateAsync(
    { type: 'blob', compression: 'STORE', mimeType: 'application/zip' },
    (meta) => {
      if (!signal.aborted) onProgress(packProgress(meta.percent, total))
    },
  )
}

export async function exportZip(
  source: ImageSource,
  files: SliceFile[],
  settings: ExportSettings,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<ExportResult> {
  const ordered = sortBySequence(files)
  const filename = zipFilename(settings, source.name, ordered.length)
  const options = encodeOptionsFromSettings(settings)
  const entries: WorkerEntry[] = ordered.map((file) => ({
    filename: file.filename,
    rect: {
      x: file.region.x,
      y: file.region.y,
      w: file.region.w,
      h: file.region.h,
    },
  }))

  let blob: Blob
  if (supportsWorker()) {
    try {
      blob = await runWorker(
        { type: 'export', blob: source.file, entries, options },
        onProgress,
        signal,
      )
    } catch (error) {
      if (isExportCancelled(error)) throw error
      if (!(error instanceof FallbackNeeded)) throw error
      blob = await runMain(source, entries, options, onProgress, signal)
    }
  } else {
    blob = await runMain(source, entries, options, onProgress, signal)
  }

  return { blob, count: ordered.length, filename }
}
