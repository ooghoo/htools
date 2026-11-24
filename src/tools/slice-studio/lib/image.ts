/**
 * 图片导入：只读本地 File，解码成 HTMLImageElement 供画布预览使用。
 * 全程使用 object URL，不发任何网络请求；失败路径都会释放 URL。
 */

import { MAX_FILE_BYTES, MAX_SOURCE_PIXELS } from './constants.ts'
import type { ImageSource } from '../types.ts'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp']

export function isAcceptedImageFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ALLOWED_MIME.includes(file.type)) return true
  // 某些来源（剪贴板、部分浏览器）不带 MIME，只按扩展名判断
  return ALLOWED_EXT.includes(ext)
}

export function describeFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (file.type === 'image/png' || ext === 'png') return 'PNG'
  if (file.type === 'image/webp' || ext === 'webp') return 'WEBP'
  return 'JPEG'
}

export function readImageFile(file: File): Promise<ImageSource> {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      reject(new Error('文件为空，请选择一张有效的图片。'))
      return
    }
    if (!isAcceptedImageFile(file)) {
      reject(new Error('仅支持 JPG、JPEG、PNG、WebP 格式的图片。'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('图片超过 80 MB，请先压缩后再导入。'))
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = 'async'

    const fail = (message: string) => {
      URL.revokeObjectURL(url)
      image.onload = null
      image.onerror = null
      reject(new Error(message))
    }

    image.onload = () => {
      const width = image.naturalWidth
      const height = image.naturalHeight
      if (!width || !height) {
        fail('无法读取图片尺寸，文件可能已损坏。')
        return
      }
      if (width * height > MAX_SOURCE_PIXELS) {
        fail('图片像素数超过 1 亿，超出浏览器可安全处理的范围。')
        return
      }
      resolve({
        file,
        url,
        image,
        name: file.name || 'pasted-image.png',
        format: describeFormat(file),
        width,
        height,
        size: file.size,
      })
    }
    image.onerror = () => fail('图片解码失败：文件可能已损坏，或浏览器不支持该编码。')
    image.src = url
  })
}

/** 换图 / 清空时释放解码结果与 object URL */
export function releaseImageSource(source: ImageSource | null | undefined): void {
  if (!source) return
  URL.revokeObjectURL(source.url)
  source.image.onload = null
  source.image.onerror = null
  source.image.removeAttribute('src')
}

/** 从粘贴事件里取出第一张图片文件 */
export function imageFromClipboard(event: ClipboardEvent): File | null {
  const items = Array.from(event.clipboardData?.items ?? [])
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }
  return null
}
