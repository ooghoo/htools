/** 本地 Blob 下载：创建临时 object URL，点击后延时释放 */

import { encodeOptionsFromSettings, encodeSliceOnMain } from './encode.ts'
import type { ExportSettings, ImageSource, SliceFile } from '../types.ts'

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 浏览器读完 blob 后释放，避免长时间占用内存
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** 单张下载：主线程即时编码，不启动 Worker */
export async function downloadSingleSlice(
  source: ImageSource,
  slice: SliceFile,
  settings: ExportSettings,
): Promise<void> {
  const options = encodeOptionsFromSettings(settings)
  const blob = await encodeSliceOnMain(source.image, slice.region, options)
  triggerDownload(blob, slice.filename)
}
