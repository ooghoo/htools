/**
 * Slice Studio 的公共类型。
 * 纯类型文件：不依赖 React / DOM 运行时，lib 与 worker 都能引用。
 */

export type OutputFormat = 'png' | 'jpeg' | 'webp'
export type CutMode = 'grid' | 'custom'
export type SliceOrder = 'asc' | 'desc'
export type PaddingMode = 'none' | '2' | '3' | 'auto'

/** 全部坐标与尺寸都是「原图像素」整数，绝不使用缩放后的屏幕坐标 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SliceRegion extends Rect {
  /** 自然顺序的稳定 ID：r{row}c{col} */
  id: string
  /** 自然顺序序号（从 0 开始，从左到右、从上到下） */
  index: number
  row: number
  col: number
}

export interface ImageSource {
  file: File
  /** 本地 object URL，仅用于预览，不产生任何网络请求 */
  url: string
  image: HTMLImageElement
  name: string
  /** 展示用的格式标签：JPEG / PNG / WEBP */
  format: string
  width: number
  height: number
  size: number
}

export interface GridConfig {
  rows: number
  cols: number
}

export interface CustomConfig {
  /** 竖向切割线的 x 坐标（原图像素），不含 0 与 width */
  xs: number[]
  /** 横向切割线的 y 坐标（原图像素），不含 0 与 height */
  ys: number[]
}

export interface ExportSettings {
  format: OutputFormat
  /** 0.5 ~ 1，仅 JPG / WebP 生效 */
  quality: number
  /** JPG 透明区域底色，HEX */
  background: string
  prefix: string
  padding: PaddingMode
  order: SliceOrder
}

/** 编码层需要的参数，与 UI 设置解耦 */
export interface EncodeOptions {
  mime: string
  quality: number
  /** null 表示保留透明通道 */
  background: string | null
}

/** 一个切片 + 它最终的文件名 / 编号 */
export interface SliceFile {
  region: SliceRegion
  filename: string
  /** 导出编号（1 起），由正序 / 逆序决定 */
  sequence: number
}

export interface ExportProgress {
  phase: 'encoding' | 'packing'
  current: number
  total: number
  /** 0 ~ 1 */
  percent: number
}

export interface ExportResult {
  blob: Blob
  count: number
  filename: string
}

/* ---------------- Worker 消息协议 ---------------- */

export interface WorkerEntry {
  filename: string
  rect: Rect
}

export interface WorkerRequest {
  type: 'export'
  blob: Blob
  entries: WorkerEntry[]
  options: EncodeOptions
}

export type WorkerResponse =
  | { type: 'progress'; progress: ExportProgress }
  | { type: 'done'; blob: Blob; count: number }
  | { type: 'error'; message: string; /** 是否可以在主线程降级重试 */ fallback: boolean }
