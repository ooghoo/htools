import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCut,
  clampAxis,
  computeCustomRegions,
  computeGridRegions,
  cutsToBoundaries,
  moveCut,
  normalizeCuts,
  normalizeGrid,
  regionAt,
  removeCut,
  segmentSizes,
  splitBoundaries,
  verifyTiling,
} from './grid.ts'

test('等分：1000×900 切 3×3，边界与尺寸符合整数像素分配', () => {
  assert.deepEqual(splitBoundaries(1000, 3), [0, 333, 667, 1000])
  assert.deepEqual(splitBoundaries(900, 3), [0, 300, 600, 900])
  assert.deepEqual(segmentSizes(splitBoundaries(1000, 3)), [333, 334, 333])

  const regions = computeGridRegions(1000, 900, 3, 3)
  assert.equal(regions.length, 9)
  assert.equal(regions[0].w, 333)
  assert.equal(regions[1].x, 333)
  assert.equal(regions[8].x + regions[8].w, 1000)
  assert.equal(regions[8].y + regions[8].h, 900)
  assert.deepEqual(verifyTiling(regions, 1000, 900), { ok: true })
})

test('无法整除：1001×997 切 3×4 也不重不漏', () => {
  const regions = computeGridRegions(1001, 997, 3, 4)
  assert.equal(regions.length, 12)
  assert.deepEqual(verifyTiling(regions, 1001, 997), { ok: true })
  for (const r of regions) {
    assert.ok(r.w >= 1 && r.h >= 1)
    assert.ok(Number.isInteger(r.x) && Number.isInteger(r.y))
  }
})

test('极端尺寸：图片比行列数还小时自动收敛，绝不产生 0 像素切片', () => {
  assert.equal(clampAxis(10, 5), 5)
  const regions = computeGridRegions(5, 3, 10, 10)
  assert.equal(regions.length, 15)
  assert.deepEqual(verifyTiling(regions, 5, 3), { ok: true })
  assert.deepEqual(splitBoundaries(3, 20), [0, 1, 2, 3])
})

test('总数上限：20×20 会被收敛到 400 以内', () => {
  const grid = normalizeGrid(5000, 5000, 20, 20)
  assert.ok(grid.rows * grid.cols <= 400)
  assert.deepEqual(verifyTiling(computeGridRegions(5000, 5000, 20, 20), 5000, 5000), { ok: true })
})

test('自定义切割：乱序 / 重复 / 越界坐标会被规范化', () => {
  assert.deepEqual(normalizeCuts([500, 100, 100, -3, 9999], 1000), [100, 500])
  assert.deepEqual(cutsToBoundaries([250, 750], 1000), [0, 250, 750, 1000])
  const regions = computeCustomRegions(1000, 600, { xs: [750, 250], ys: [400] })
  assert.equal(regions.length, 6)
  assert.deepEqual(verifyTiling(regions, 1000, 600), { ok: true })
  // 支持不同宽度 / 高度的切片
  assert.deepEqual([...new Set(regions.map((r) => r.w))].sort((a, b) => a - b), [250, 500])
  assert.deepEqual([...new Set(regions.map((r) => r.h))].sort((a, b) => a - b), [200, 400])
})

test('切割线增删改：不会交叉、不会贴边', () => {
  const cuts = addCut([], 1000)
  assert.deepEqual(cuts, [500])
  const two = addCut(cuts, 1000)
  assert.deepEqual(two, [250, 500])
  assert.deepEqual(verifyTiling(computeCustomRegions(1000, 1000, { xs: two, ys: [] }), 1000, 1000), {
    ok: true,
  })

  assert.deepEqual(moveCut(two, 0, 900, 1000), [499, 500])
  assert.deepEqual(moveCut(two, 1, 0, 1000), [250, 251])
  assert.deepEqual(removeCut(two, 0, 1000), [500])
})

test('命中测试：边界点落在左上切片，右下角落在最后一块', () => {
  const regions = computeGridRegions(1000, 900, 3, 3)
  assert.equal(regionAt(regions, 0, 0)?.id, 'r0c0')
  assert.equal(regionAt(regions, 1000, 900)?.id, 'r2c2')
  assert.equal(regionAt(regions, -1, 10), null)
})

test('1×1 网格等价于原图', () => {
  const regions = computeGridRegions(1920, 1080, 1, 1)
  assert.deepEqual(regions[0], {
    id: 'r0c0',
    index: 0,
    row: 0,
    col: 0,
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
  })
})
