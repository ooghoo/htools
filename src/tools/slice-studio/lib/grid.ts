/**
 * 切割算法（纯函数，与 DOM / React 完全无关）。
 *
 * 不变量：
 *  1. 所有坐标都是原图像素整数；
 *  2. 相邻分段首尾相接，无缝隙、无重叠；
 *  3. 无法整除时把余数分散到前面的分段（例如 1000 / 3 → 334 / 333 / 333），
 *     绝不四舍五入后留下 1px 缝，也绝不擅自缩放图片。
 */

import { MAX_AXIS, MAX_SLICES } from './constants.ts'
import type { CustomConfig, GridConfig, Rect, SliceRegion } from '../types.ts'

function toInt(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 1
}

/** 单个方向的行/列数：受图片像素数、单轴上限与总切片数约束 */
export function clampAxis(value: number, length: number): number {
  const requested = Math.max(1, toInt(value))
  const byPixels = Math.max(1, Math.floor(length))
  return Math.max(1, Math.min(requested, MAX_AXIS, byPixels))
}

export function normalizeGrid(width: number, height: number, rows: number, cols: number): GridConfig {
  let r = clampAxis(rows, height)
  let c = clampAxis(cols, width)
  // 总数上限：优先削减较大的一轴，保证两个方向都尽量接近用户输入
  while (r * c > MAX_SLICES) {
    if (c >= r && c > 1) c -= 1
    else if (r > 1) r -= 1
    else break
  }
  return { rows: r, cols: c }
}

/**
 * 把长度 length 切成 parts 段，返回 parts+1 个边界（含 0 与 length）。
 * 每段至少 1px，余数均匀分布在前面的段上。
 */
export function splitBoundaries(length: number, parts: number): number[] {
  const total = Math.max(1, Math.floor(length))
  const count = Math.max(1, Math.min(parts, total))
  if (count === 1) return [0, total]

  const result = [0]
  for (let i = 1; i < count; i += 1) {
    const ideal = Math.round((total * i) / count)
    // 上界保证剩余段数都至少有 1px，下界保证不与上一条边界重合
    const upper = total - (count - i)
    const boundary = Math.min(upper, Math.max(result[i - 1] + 1, ideal))
    result.push(boundary)
  }
  result.push(total)
  return result
}

/** 边界数组 → 每段长度，用于展示「无法整除」时的实际像素分配 */
export function segmentSizes(boundaries: number[]): number[] {
  const sizes: number[] = []
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    sizes.push(boundaries[i + 1] - boundaries[i])
  }
  return sizes
}

/** 自定义切割线：排序、去重、夹到 (0, length) 之间，且不产生 0 宽分段 */
export function normalizeCuts(positions: number[], length: number): number[] {
  const total = Math.max(1, Math.floor(length))
  const sorted = positions
    .map(toInt)
    .filter((value) => value > 0 && value < total)
    .sort((a, b) => a - b)

  const result: number[] = []
  for (const value of sorted) {
    if (result.length === 0 || value > result[result.length - 1]) result.push(value)
  }
  return result
}

export function cutsToBoundaries(cuts: number[], length: number): number[] {
  const total = Math.max(1, Math.floor(length))
  return [0, ...normalizeCuts(cuts, total), total]
}

function regionsFromBoundaries(xEdges: number[], yEdges: number[]): SliceRegion[] {
  const regions: SliceRegion[] = []
  for (let row = 0; row < yEdges.length - 1; row += 1) {
    for (let col = 0; col < xEdges.length - 1; col += 1) {
      const x = xEdges[col]
      const y = yEdges[row]
      regions.push({
        id: `r${row}c${col}`,
        index: regions.length,
        row,
        col,
        x,
        y,
        w: xEdges[col + 1] - x,
        h: yEdges[row + 1] - y,
      })
    }
  }
  return regions
}

export function computeGridRegions(
  width: number,
  height: number,
  rows: number,
  cols: number,
): SliceRegion[] {
  const grid = normalizeGrid(width, height, rows, cols)
  return regionsFromBoundaries(
    splitBoundaries(width, grid.cols),
    splitBoundaries(height, grid.rows),
  )
}

export function computeCustomRegions(
  width: number,
  height: number,
  config: CustomConfig,
): SliceRegion[] {
  return regionsFromBoundaries(
    cutsToBoundaries(config.xs, width),
    cutsToBoundaries(config.ys, height),
  )
}

/** 在最大空白区间中点插入一条切割线；已无处可插时原样返回 */
export function addCut(positions: number[], length: number): number[] {
  const cuts = normalizeCuts(positions, length)
  const edges = [0, ...cuts, Math.max(1, Math.floor(length))]
  let bestGap = 1
  let insertAt = -1
  let value = 0

  for (let i = 0; i < edges.length - 1; i += 1) {
    const gap = edges[i + 1] - edges[i]
    if (gap > bestGap) {
      bestGap = gap
      insertAt = i
      value = edges[i] + Math.floor(gap / 2)
    }
  }
  if (insertAt < 0 || value <= 0 || value >= length) return cuts

  return normalizeCuts([...cuts.slice(0, insertAt), value, ...cuts.slice(insertAt)], length)
}

/** 拖动切割线：限制在相邻两条线之间，禁止交叉，返回新的有序数组 */
export function moveCut(positions: number[], index: number, value: number, length: number): number[] {
  const cuts = normalizeCuts(positions, length)
  if (index < 0 || index >= cuts.length) return cuts
  const lower = index === 0 ? 0 : cuts[index - 1]
  const upper = index === cuts.length - 1 ? Math.floor(length) : cuts[index + 1]
  if (upper - lower < 2) return cuts
  const next = Math.min(upper - 1, Math.max(lower + 1, toInt(value)))
  const result = [...cuts]
  result[index] = next
  return result
}

export function removeCut(positions: number[], index: number, length: number): number[] {
  return normalizeCuts(positions.filter((_, i) => i !== index), length)
}

/** 命中测试：屏幕坐标换算成原图像素后调用 */
export function regionAt(regions: SliceRegion[], x: number, y: number): SliceRegion | null {
  for (const region of regions) {
    if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) {
      return region
    }
  }
  return null
}

/** 自检：给测试用，同时也可作为运行期断言 */
export function verifyTiling(
  regions: SliceRegion[],
  width: number,
  height: number,
): { ok: boolean; reason?: string } {
  let area = 0
  for (const r of regions) {
    if (r.w <= 0 || r.h <= 0) return { ok: false, reason: '存在 0 尺寸的切片' }
    if (r.x < 0 || r.y < 0 || r.x + r.w > width || r.y + r.h > height) {
      return { ok: false, reason: '切片越出原图边界' }
    }
    area += r.w * r.h
  }
  if (area !== width * height) return { ok: false, reason: '切片面积之和不等于原图面积' }
  for (let i = 0; i < regions.length; i += 1) {
    for (let j = i + 1; j < regions.length; j += 1) {
      if (overlaps(regions[i], regions[j])) return { ok: false, reason: '切片之间存在重叠' }
    }
  }
  return { ok: true }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}
